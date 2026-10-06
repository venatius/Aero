import { AeroVision } from './vision';
import './pill';
import { AeroPill } from './pill';

const video = document.getElementById('webcam') as HTMLVideoElement;
const canvas = document.getElementById('output') as HTMLCanvasElement;
const logDiv = document.getElementById('log') as HTMLDivElement;
const gestureSpan = document.getElementById('current-gesture') as HTMLSpanElement;

async function init() {
  const vision = new AeroVision(video, canvas);
  const pill = document.getElementById('aero-pill') as AeroPill;
  
  function logEvent(msg: string) {
    const el = document.createElement('div');
    el.className = 'log-entry';
    el.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logDiv.prepend(el);
  }

  vision.addEventListener(event => {
    pill.showEvent(event);
    if (event.type === 'PINCH_DRAG') {
      logEvent(`PINCH_DRAG: ${(event.value * 100).toFixed(0)}%`);
    } else {
      logEvent(event.type);
    }
  });

  try {
    await vision.initialize('/assets', '/assets/gesture_recognizer.task');
    await vision.start();
    setInterval(() => {
      gestureSpan.innerText = vision.getCurrentGesture();
      pill.drawSkeleton(vision.getLandmarks());
    }, 100);
  } catch (e) {
    console.error(e);
  }
}

init();
