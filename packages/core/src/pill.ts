import { AeroGestureEvent } from './vision';

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
  <style>
    :host {
      display: block;
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      font-family: -apple-system, "SF Pro", "Segoe UI", Inter, Roboto, sans-serif;
      pointer-events: none;
    }
    
    .pill {
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-radius: 32px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      transition: width 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275),
                  height 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275),
                  border-radius 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      width: 48px;
      height: 48px;
      position: relative;
    }

    @media (prefers-reduced-motion: reduce) {
      .pill {
        transition: width 0.2s ease, height 0.2s ease;
      }
    }

    .pill.expanded {
      width: 200px;
      height: 64px;
      border-radius: 32px;
    }

    .preview-canvas {
      width: 48px;
      height: 48px;
      position: absolute;
      left: 0;
      top: 0;
      opacity: 1;
      transition: opacity 0.2s;
    }

    .pill.expanded .preview-canvas {
      opacity: 0;
    }

    .content {
      display: flex;
      align-items: center;
      gap: 12px;
      opacity: 0;
      transition: opacity 0.2s;
      white-space: nowrap;
      position: absolute;
      left: 20px;
      right: 20px;
    }

    .pill.expanded .content {
      opacity: 1;
      transition-delay: 0.1s;
    }

    .icon {
      font-size: 24px;
    }
    
    .text {
      font-weight: 500;
      font-size: 16px;
      flex: 1;
    }

    .bar-container {
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 2px;
      margin-top: 4px;
      display: none;
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      background: white;
      width: 0%;
      transition: width 0.1s linear;
    }
    
    .pill.expanded.has-bar .bar-container {
      display: block;
    }
    .pill.expanded.has-bar .text-wrapper {
      display: flex;
      flex-direction: column;
      width: 100%;
    }
  </style>
  <div class="pill" id="pill">
    <canvas class="preview-canvas" id="canvas" width="48" height="48"></canvas>
    <div class="content">
      <div class="icon" id="icon">✌️</div>
      <div class="text-wrapper">
        <div class="text" id="text">Label</div>
        <div class="bar-container"><div class="bar-fill" id="bar"></div></div>
      </div>
    </div>
  </div>
`;

export class AeroPill extends HTMLElement {
  private pillEl!: HTMLDivElement;
  private canvasEl!: HTMLCanvasElement;
  private iconEl!: HTMLDivElement;
  private textEl!: HTMLDivElement;
  private barEl!: HTMLDivElement;
  private ctx!: CanvasRenderingContext2D;
  private collapseTimeout: any;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.appendChild(TEMPLATE.content.cloneNode(true));
  }

  connectedCallback() {
    this.pillEl = this.shadowRoot!.getElementById('pill') as HTMLDivElement;
    this.canvasEl = this.shadowRoot!.getElementById('canvas') as HTMLCanvasElement;
    this.iconEl = this.shadowRoot!.getElementById('icon') as HTMLDivElement;
    this.textEl = this.shadowRoot!.getElementById('text') as HTMLDivElement;
    this.barEl = this.shadowRoot!.getElementById('bar') as HTMLDivElement;
    this.ctx = this.canvasEl.getContext('2d')!;
  }

  public drawSkeleton(landmarks: {x: number, y: number}[]) {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, 48, 48);
    if (!landmarks || landmarks.length === 0) return;

    this.ctx.save();
    // Hand coords are 0..1. Map to 48x48. Hand might not be centered, but we approximate.
    // Just scaling them might draw out of bounds. Let's find bounding box and center it.
    let minX = 1, maxX = 0, minY = 1, maxY = 0;
    for (const p of landmarks) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const size = Math.max(maxX - minX, maxY - minY) || 1;
    const scale = 36 / size; // leave some padding

    this.ctx.translate(24, 24);
    this.ctx.scale(scale, scale);
    this.ctx.translate(-cx, -cy);

    this.ctx.strokeStyle = '#00FF00';
    this.ctx.lineWidth = 2 / scale;
    this.ctx.fillStyle = '#FF0000';

    // Simple drawing of connections (for a tiny preview, we just draw dots for now, or lines if we have the connection map)
    const connections = [
      [0,1],[1,2],[2,3],[3,4], // thumb
      [0,5],[5,6],[6,7],[7,8], // index
      [5,9],[9,10],[10,11],[11,12], // middle
      [9,13],[13,14],[14,15],[15,16], // ring
      [13,17],[17,18],[18,19],[19,20], // pinky
      [0,17] // palm base
    ];

    this.ctx.beginPath();
    for (const [a, b] of connections) {
      if (landmarks[a] && landmarks[b]) {
        this.ctx.moveTo(landmarks[a].x, landmarks[a].y);
        this.ctx.lineTo(landmarks[b].x, landmarks[b].y);
      }
    }
    this.ctx.stroke();

    this.ctx.restore();
  }

  public showEvent(event: AeroGestureEvent) {
    clearTimeout(this.collapseTimeout);
    
    this.pillEl.classList.add('expanded');
    this.pillEl.classList.remove('has-bar');

    switch (event.type) {
      case 'SWIPE_LEFT':
        this.iconEl.innerText = '👉';
        this.textEl.innerText = 'Next slide →';
        break;
      case 'SWIPE_RIGHT':
        this.iconEl.innerText = '👈';
        this.textEl.innerText = '← Previous';
        break;
      case 'PALM_HOLD':
        this.iconEl.innerText = '⏸️';
        this.textEl.innerText = 'Paused';
        break;
      case 'PINCH_DRAG':
        this.iconEl.innerText = '🎚️';
        this.textEl.innerText = `Volume ${(event.value * 100).toFixed(0)}%`;
        this.pillEl.classList.add('has-bar');
        this.barEl.style.width = `${event.value * 100}%`;
        break;
      case 'FIST':
        this.iconEl.innerText = '✊';
        this.textEl.innerText = 'Mode Switched';
        break;
    }

    this.collapseTimeout = setTimeout(() => {
      this.pillEl.classList.remove('expanded');
    }, 1200);
  }
}

customElements.define('aero-pill', AeroPill);
