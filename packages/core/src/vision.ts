import { FilesetResolver, GestureRecognizer, DrawingUtils, NormalizedLandmark } from '@mediapipe/tasks-vision';

export interface GestureConfig {
  swipeThreshold: number; // fraction of frame width
  swipeTimeoutMs: number;
  holdTimeoutMs: number;
  pinchDistanceThreshold: number;
  pinchDragCooldownMs: number;
  emaAlpha: number; // for landmark smoothing
}

export const DEFAULT_CONFIG: GestureConfig = {
  swipeThreshold: 0.25,
  swipeTimeoutMs: 400,
  holdTimeoutMs: 600,
  pinchDistanceThreshold: 0.15, // ratio to palm size
  pinchDragCooldownMs: 50,
  emaAlpha: 0.5,
};

export type AeroGestureEvent = 
  | { type: 'SWIPE_LEFT' }
  | { type: 'SWIPE_RIGHT' }
  | { type: 'PALM_HOLD' }
  | { type: 'PINCH_DRAG'; value: number }
  | { type: 'FIST' };

export type GestureEventListener = (event: AeroGestureEvent) => void;

export class AeroVision {
  private video: HTMLVideoElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private recognizer: GestureRecognizer | null = null;
  private config: GestureConfig;
  private isRunning = false;
  private listeners: GestureEventListener[] = [];

  // State machine tracking
  private lastTimeMs = -1;
  private currentGesture = 'None';
  private smoothedLandmarks: NormalizedLandmark[] = [];
  
  // Swipe tracking
  private palmStartTime = 0;
  private palmStartX = 0;
  private palmHoldTriggered = false;
  
  // Pinch tracking
  private isPinching = false;
  private pinchStartY = 0;
  private lastPinchEmitMs = 0;
  
  // Fist tracking
  private fistCooldown = false;

  // Swipe cooldown
  private swipeCooldown = false;

  constructor(video: HTMLVideoElement, canvas: HTMLCanvasElement, config: Partial<GestureConfig> = {}) {
    this.video = video;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  public addEventListener(listener: GestureEventListener): void {
    this.listeners.push(listener);
  }

  private emit(event: AeroGestureEvent): void {
    this.listeners.forEach(l => l(event));
  }

  public async initialize(wasmPath: string, modelPath: string): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(wasmPath);
    try {
      this.recognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: { modelAssetPath: modelPath, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numHands: 1
      });
    } catch {
      console.warn('GPU delegate failed, falling back to CPU');
      this.recognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: { modelAssetPath: modelPath, delegate: 'CPU' },
        runningMode: 'VIDEO',
        numHands: 1
      });
    }
  }

  public async start(): Promise<void> {
    if (!this.recognizer) throw new Error('Call initialize() first');

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user',
        frameRate: { ideal: 30 }
      }
    });

    this.video.srcObject = stream;
    await new Promise<void>((resolve) => {
      this.video.onloadedmetadata = () => { this.video.play(); resolve(); };
    });

    this.canvas.width = this.video.videoWidth;
    this.canvas.height = this.video.videoHeight;
    this.isRunning = true;
    this.loop();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.video.srcObject) {
      (this.video.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
  }

  private loop = (): void => {
    if (!this.isRunning) return;

    const startTimeMs = performance.now();

    if (this.video.currentTime !== this.lastTimeMs) {
      this.lastTimeMs = this.video.currentTime;
      const results = this.recognizer!.recognizeForVideo(this.video, startTimeMs);

      this.ctx.save();
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Draw mirrored video for user feedback
      this.ctx.translate(this.canvas.width, 0);
      this.ctx.scale(-1, 1);
      this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

      if (results.landmarks && results.landmarks.length > 0) {
        const rawLandmarks = results.landmarks[0];

        // EMA smoothing
        if (this.smoothedLandmarks.length === 0) {
          this.smoothedLandmarks = rawLandmarks.map(l => ({ ...l }));
        } else {
          const a = this.config.emaAlpha;
          for (let i = 0; i < rawLandmarks.length; i++) {
            this.smoothedLandmarks[i].x = a * rawLandmarks[i].x + (1 - a) * this.smoothedLandmarks[i].x;
            this.smoothedLandmarks[i].y = a * rawLandmarks[i].y + (1 - a) * this.smoothedLandmarks[i].y;
            this.smoothedLandmarks[i].z = a * rawLandmarks[i].z + (1 - a) * this.smoothedLandmarks[i].z;
          }
        }

        const drawingUtils = new DrawingUtils(this.ctx);
        drawingUtils.drawConnectors(this.smoothedLandmarks, GestureRecognizer.HAND_CONNECTIONS, {
          color: '#00FF00', lineWidth: 2
        });
        drawingUtils.drawLandmarks(this.smoothedLandmarks, {
          color: '#FF0000', lineWidth: 1, radius: 2
        });

        const gesture = results.gestures[0]?.[0]?.categoryName ?? 'None';
        this.processGesture(gesture, this.smoothedLandmarks, startTimeMs);
      } else {
        this.resetState();
      }
      this.ctx.restore();
    }

    requestAnimationFrame(this.loop);
  };

  private resetState(): void {
    this.currentGesture = 'None';
    this.smoothedLandmarks = [];
    this.palmStartTime = 0;
    this.palmHoldTriggered = false;
    this.isPinching = false;
    this.fistCooldown = false;
    this.swipeCooldown = false;
  }

  private processGesture(gestureName: string, landmarks: NormalizedLandmark[], timeMs: number): void {
    this.currentGesture = gestureName;

    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleMcp = landmarks[9];

    // Palm size proxy: wrist → middle-finger MCP
    const palmSize = Math.hypot(wrist.x - middleMcp.x, wrist.y - middleMcp.y);
    const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y) / palmSize;

    // --- FIST: cycle modes ---
    if (gestureName === 'Closed_Fist') {
      if (!this.fistCooldown) {
        this.emit({ type: 'FIST' });
        this.fistCooldown = true;
        setTimeout(() => { this.fistCooldown = false; }, 1000);
      }
      this.palmStartTime = 0;
      this.isPinching = false;
      return;
    }

    // --- OPEN PALM: swipe or hold ---
    if (gestureName === 'Open_Palm') {
      if (this.palmStartTime === 0) {
        this.palmStartTime = timeMs;
        this.palmStartX = wrist.x;
        this.palmHoldTriggered = false;
      } else {
        // MediaPipe landmark x: 0=left edge of image, 1=right edge.
        // Camera is front-facing (mirrored display) but landmarks are in
        // raw image coordinates. User moving hand to their RIGHT moves the
        // hand to the LEFT side of the raw image → x decreases.
        //   dx < 0  ⇒  user swiped RIGHT  → SWIPE_RIGHT
        //   dx > 0  ⇒  user swiped LEFT   → SWIPE_LEFT
        const dx = wrist.x - this.palmStartX;
        const dt = timeMs - this.palmStartTime;

        if (dt < this.config.swipeTimeoutMs && !this.swipeCooldown) {
          if (dx > this.config.swipeThreshold) {
            this.emit({ type: 'SWIPE_LEFT' });
            this.palmStartTime = 0;
            this.swipeCooldown = true;
            setTimeout(() => { this.swipeCooldown = false; }, 500);
          } else if (dx < -this.config.swipeThreshold) {
            this.emit({ type: 'SWIPE_RIGHT' });
            this.palmStartTime = 0;
            this.swipeCooldown = true;
            setTimeout(() => { this.swipeCooldown = false; }, 500);
          }
        } else if (dt >= this.config.holdTimeoutMs && !this.palmHoldTriggered) {
          // Hand stayed relatively still
          if (Math.abs(dx) < this.config.swipeThreshold * 0.5) {
            this.emit({ type: 'PALM_HOLD' });
            this.palmHoldTriggered = true;
          }
        }
      }
      this.isPinching = false;
      return;
    }

    // Not Open_Palm — reset palm tracking
    this.palmStartTime = 0;

    // --- PINCH DRAG: volume / zoom ---
    if (pinchDist < this.config.pinchDistanceThreshold) {
      if (!this.isPinching) {
        this.isPinching = true;
        this.pinchStartY = wrist.y;
      } else if (timeMs - this.lastPinchEmitMs > this.config.pinchDragCooldownMs) {
        // y: 0 = top, 1 = bottom. Moving hand UP → smaller y → higher value.
        const dy = wrist.y - this.pinchStartY;
        let val = 0.5 - dy * 1.5;
        val = Math.max(0, Math.min(1, val));
        this.emit({ type: 'PINCH_DRAG', value: val });
        this.lastPinchEmitMs = timeMs;
      }
    } else {
      this.isPinching = false;
    }
  }

  public getCurrentGesture(): string {
    return this.currentGesture;
  }

  public getLandmarks(): NormalizedLandmark[] {
    return this.smoothedLandmarks;
  }
}
