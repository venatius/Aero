import { AeroVision, AeroPill } from '@aero/core';

declare global {
  interface Window {
    electronAPI: {
      sendGesture: (event: any) => void;
      onGesture: (callback: (event: any) => void) => void;
      onModeChanged: (callback: (mode: string) => void) => void;
    }
  }
}

async function initCamera() {
  document.getElementById('camera-root')!.style.display = 'block';
  
  const video = document.getElementById('webcam') as HTMLVideoElement;
  const canvas = document.getElementById('output') as HTMLCanvasElement;
  
  const vision = new AeroVision(video, canvas);
  vision.addEventListener(event => {
    window.electronAPI.sendGesture({ ...event, landmarks: vision.getLandmarks() });
  });

  try {
    // Note: the model file needs to be served or loaded via file protocol. 
    // In electron-vite we can just put it in resources or public folder.
    // For now we'll fetch from local node_modules/@aero/core/public/assets or public.
    // We can copy it into desktop app's public folder during build, or just reference it.
    // Let's use the local path if possible. Actually, we should fetch it from remote for simplicity if it fails, or bundle it.
    // Let's assume we copy the assets folder to apps/desktop/public/assets.
    await vision.initialize(
      './assets',
      './assets/gesture_recognizer.task'
    );
    await vision.start();
  } catch (e) {
    console.error("Camera Init Error", e);
  }
}

function initOverlay() {
  document.getElementById('overlay-root')!.style.display = 'block';
  const pill = document.getElementById('aero-pill') as AeroPill;

  let currentMode = 'Slides';

  window.electronAPI.onModeChanged((mode) => {
    currentMode = mode;
    // Show pill to indicate mode switch
    pill.showEvent({ type: 'FIST' } as any); 
    // Hack: manually override the text to show the new mode
    setTimeout(() => {
      const textEl = pill.shadowRoot?.getElementById('text');
      const iconEl = pill.shadowRoot?.getElementById('icon');
      if (textEl) textEl.innerText = `Mode: ${currentMode}`;
      if (iconEl) iconEl.innerText = '⚙️';
    }, 10);
  });

  window.electronAPI.onGesture((event) => {
    pill.showEvent(event);
    if (event.landmarks) {
      pill.drawSkeleton(event.landmarks);
    }
  });
}

if (window.location.hash === '#camera') {
  initCamera();
} else {
  initOverlay();
}
