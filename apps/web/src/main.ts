import { AeroVision, AeroPill } from '@aero/core';

// UI State
let currentTab: 'slides' | 'music' | 'photos' = 'slides';
const tabs = ['slides', 'music', 'photos'];

let slideIndex = 1;
const maxSlides = 6;

let musicIndex = 1;
const maxMusic = 3;
let isPlaying = false;
let volume = 1.0;

let photoIndex = 1;
const maxPhotos = 5;
let photoZoom = 1.0;

const startBtn = document.getElementById('start-btn')!;
const onboarding = document.getElementById('onboarding')!;
const pill = document.getElementById('aero-pill') as AeroPill;

function switchTab(tab: string) {
  currentTab = tab as any;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  
  document.querySelector(`.tab[data-tab="${tab}"]`)?.classList.add('active');
  document.getElementById(tab)?.classList.add('active');
  
  pill.showEvent({ type: 'FIST' } as any);
  setTimeout(() => {
    const textEl = pill.shadowRoot?.getElementById('text');
    const iconEl = pill.shadowRoot?.getElementById('icon');
    if (textEl) textEl.innerText = `Mode: ${tab}`;
    if (iconEl) iconEl.innerText = '⚙️';
  }, 10);
}

function updateUI() {
  document.getElementById('slide-content')!.innerText = `Slide ${slideIndex} / ${maxSlides}`;
  document.getElementById('track-name')!.innerText = `Track ${musicIndex}`;
  document.getElementById('play-status')!.innerText = isPlaying ? 'Playing' : 'Paused';
  document.getElementById('vol-status')!.innerText = `Volume: ${(volume * 100).toFixed(0)}%`;
  
  const img = document.getElementById('photo-img') as HTMLImageElement;
  img.src = `https://picsum.photos/800/600?random=${photoIndex}`;
  img.style.transform = `scale(${photoZoom})`;
}

document.querySelectorAll('.tab').forEach(t => {
  t.addEventListener('click', (e) => {
    switchTab((e.target as HTMLElement).dataset.tab!);
  });
});

async function startApp() {
  onboarding.style.display = 'none';
  
  const video = document.getElementById('webcam') as HTMLVideoElement;
  const canvas = document.getElementById('output') as HTMLCanvasElement;
  
  const vision = new AeroVision(video, canvas);
  
  vision.addEventListener(event => {
    pill.showEvent(event);
    if (event.type === 'FIST') {
      const idx = tabs.indexOf(currentTab);
      switchTab(tabs[(idx + 1) % tabs.length]);
      return;
    }

    if (currentTab === 'slides') {
      if (event.type === 'SWIPE_LEFT') slideIndex = Math.min(maxSlides, slideIndex + 1);
      if (event.type === 'SWIPE_RIGHT') slideIndex = Math.max(1, slideIndex - 1);
    } else if (currentTab === 'music') {
      if (event.type === 'SWIPE_LEFT') musicIndex = Math.min(maxMusic, musicIndex + 1);
      if (event.type === 'SWIPE_RIGHT') musicIndex = Math.max(1, musicIndex - 1);
      if (event.type === 'PALM_HOLD') isPlaying = !isPlaying;
      if (event.type === 'PINCH_DRAG') volume = event.value;
    } else if (currentTab === 'photos') {
      if (event.type === 'SWIPE_LEFT') {
        photoIndex = Math.min(maxPhotos, photoIndex + 1);
        photoZoom = 1.0;
      }
      if (event.type === 'SWIPE_RIGHT') {
        photoIndex = Math.max(1, photoIndex - 1);
        photoZoom = 1.0;
      }
      if (event.type === 'PINCH_DRAG') {
        // Map 0-1 to 1-3x zoom
        photoZoom = 1.0 + (event.value * 2.0);
      }
    }
    updateUI();
  });

  try {
    await vision.initialize(
      '/assets',
      '/assets/gesture_recognizer.task'
    );
    await vision.start();

    setInterval(() => {
      pill.drawSkeleton(vision.getLandmarks());
    }, 100);

  } catch (e) {
    console.error(e);
    alert('Failed to start camera or load model.');
    onboarding.style.display = 'flex';
  }
}

startBtn.addEventListener('click', startApp);
updateUI();
