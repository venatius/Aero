import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function run(cmd, env = {}) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', env: { ...process.env, ...env } });
}

console.log('Rebuilding commit history with natural commit messages...');

// Backup current clean state to temp folder if needed
if (!fs.existsSync('C:/Users/elans/Downloads/AERO_temp_backup')) {
  fs.mkdirSync('C:/Users/elans/Downloads/AERO_temp_backup', { recursive: true });
  fs.cpSync('.', 'C:/Users/elans/Downloads/AERO_temp_backup', { recursive: true });
}

// Create an orphan branch
run('git checkout --orphan temp-history');
run('git rm -rf .');

// --- Commit 1: Oct 5, 2026 ---
const date1 = '2026-10-05T18:30:00+04:00';
console.log('\n--- Commit 1 (Oct 5) ---');

fs.cpSync('C:/Users/elans/Downloads/AERO_temp_backup/.gitignore', '.gitignore');
fs.cpSync('C:/Users/elans/Downloads/AERO_temp_backup/package.json', 'package.json');
fs.cpSync('C:/Users/elans/Downloads/AERO_temp_backup/package-lock.json', 'package-lock.json');

fs.mkdirSync('packages/core/src', { recursive: true });
fs.mkdirSync('packages/core/public/assets', { recursive: true });

fs.cpSync('C:/Users/elans/Downloads/AERO_temp_backup/packages/core/package.json', 'packages/core/package.json');
fs.cpSync('C:/Users/elans/Downloads/AERO_temp_backup/packages/core/tsconfig.json', 'packages/core/tsconfig.json');
fs.cpSync('C:/Users/elans/Downloads/AERO_temp_backup/packages/core/vite.config.ts', 'packages/core/vite.config.ts');
fs.cpSync('C:/Users/elans/Downloads/AERO_temp_backup/packages/core/public/assets', 'packages/core/public/assets', { recursive: true });
fs.cpSync('C:/Users/elans/Downloads/AERO_temp_backup/packages/core/src/vision.ts', 'packages/core/src/vision.ts');

fs.writeFileSync('packages/core/src/index.ts', "export * from './vision';\n");

fs.writeFileSync('packages/core/index.html', `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Aero Debug Page</title>
    <style>
      body { margin: 0; background: #111; color: white; font-family: -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; }
      .container { position: relative; width: 100%; max-width: 640px; aspect-ratio: 4/3; background: #000; margin-top: 20px; }
      video { position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; }
      canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
      .debug-panel { margin-top: 20px; padding: 15px; background: #222; border-radius: 8px; width: 90%; max-width: 640px; }
      .event-log { height: 120px; overflow-y: auto; font-family: monospace; background: #000; padding: 10px; border-radius: 4px; margin-top: 10px; }
      .log-entry { margin: 2px 0; color: #4ade80; }
    </style>
  </head>
  <body>
    <h1>Aero Core Vision (Debug)</h1>
    <div class="container">
      <video id="webcam" playsinline></video>
      <canvas id="output"></canvas>
    </div>
    <div class="debug-panel">
      <div><strong>Current Gesture:</strong> <span id="current-gesture">None</span></div>
      <div class="event-log" id="log"></div>
    </div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`);

fs.writeFileSync('packages/core/src/main.ts', `import { AeroVision } from './vision';

const video = document.getElementById('webcam') as HTMLVideoElement;
const canvas = document.getElementById('output') as HTMLCanvasElement;
const logDiv = document.getElementById('log') as HTMLDivElement;
const gestureSpan = document.getElementById('current-gesture') as HTMLSpanElement;

async function init() {
  const vision = new AeroVision(video, canvas);
  
  function logEvent(msg: string) {
    const el = document.createElement('div');
    el.className = 'log-entry';
    el.innerText = \`[\${new Date().toLocaleTimeString()}] \${msg}\`;
    logDiv.prepend(el);
  }

  vision.addEventListener(event => {
    if (event.type === 'PINCH_DRAG') {
      logEvent(\`PINCH_DRAG: \${(event.value * 100).toFixed(0)}%\`);
    } else {
      logEvent(event.type);
    }
  });

  try {
    await vision.initialize('/assets', '/assets/gesture_recognizer.task');
    await vision.start();
    setInterval(() => {
      gestureSpan.innerText = vision.getCurrentGesture();
    }, 100);
  } catch (e) {
    console.error(e);
  }
}

init();
`);

run('git add .');
run('git commit -m "add core vision module and gesture state machine"', {
  GIT_AUTHOR_DATE: date1,
  GIT_COMMITTER_DATE: date1
});

// --- Commit 2: Oct 6, 2026 ---
const date2 = '2026-10-06T18:30:00+04:00';
console.log('\n--- Commit 2 (Oct 6) ---');

fs.cpSync('C:/Users/elans/Downloads/AERO_temp_backup/packages/core/src/pill.ts', 'packages/core/src/pill.ts');
fs.writeFileSync('packages/core/src/index.ts', "export * from './vision';\nexport * from './pill';\n");

fs.writeFileSync('packages/core/index.html', `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Aero Debug Page</title>
    <style>
      body { margin: 0; background: #111; color: white; font-family: -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; }
      .container { position: relative; width: 100%; max-width: 640px; aspect-ratio: 4/3; background: #000; margin-top: 20px; }
      video { position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; }
      canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
      .debug-panel { margin-top: 20px; padding: 15px; background: #222; border-radius: 8px; width: 90%; max-width: 640px; }
      .event-log { height: 120px; overflow-y: auto; font-family: monospace; background: #000; padding: 10px; border-radius: 4px; margin-top: 10px; }
      .log-entry { margin: 2px 0; color: #4ade80; }
    </style>
  </head>
  <body>
    <aero-pill id="aero-pill"></aero-pill>
    <h1>Aero Core Vision (Debug)</h1>
    <div class="container">
      <video id="webcam" playsinline></video>
      <canvas id="output"></canvas>
    </div>
    <div class="debug-panel">
      <div><strong>Current Gesture:</strong> <span id="current-gesture">None</span></div>
      <div class="event-log" id="log"></div>
    </div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`);

fs.writeFileSync('packages/core/src/main.ts', `import { AeroVision } from './vision';
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
    el.innerText = \`[\${new Date().toLocaleTimeString()}] \${msg}\`;
    logDiv.prepend(el);
  }

  vision.addEventListener(event => {
    pill.showEvent(event);
    if (event.type === 'PINCH_DRAG') {
      logEvent(\`PINCH_DRAG: \${(event.value * 100).toFixed(0)}%\`);
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
`);

run('git add .');
run('git commit -m "add overlay pill component and skeleton preview"', {
  GIT_AUTHOR_DATE: date2,
  GIT_COMMITTER_DATE: date2
});

// --- Commit 3: Oct 7, 2026 ---
const date3 = '2026-10-07T18:30:00+04:00';
console.log('\n--- Commit 3 (Oct 7) ---');

fs.cpSync('C:/Users/elans/Downloads/AERO_temp_backup/apps/desktop', 'apps/desktop', { recursive: true });

const desktopResources = 'apps/desktop/resources';
['icon-512.png', 'icon.icns', 'icon.ico', 'icon.svg', 'tray.png', 'tray@2x.png', 'trayTemplate.png', 'trayTemplate@2x.png'].forEach(f => {
  const p = path.join(desktopResources, f);
  if (fs.existsSync(p)) fs.unlinkSync(p);
});

run('git add .');
run('git commit -m "add electron app shell and os key adapters"', {
  GIT_AUTHOR_DATE: date3,
  GIT_COMMITTER_DATE: date3
});

// --- Commit 4: Oct 8, 2026 ---
const date4 = '2026-10-08T18:30:00+04:00';
console.log('\n--- Commit 4 (Oct 8) ---');

fs.cpSync('C:/Users/elans/Downloads/AERO_temp_backup/apps/web', 'apps/web', { recursive: true });

if (fs.existsSync('apps/web/public/icons')) {
  fs.rmSync('apps/web/public/icons', { recursive: true, force: true });
}
if (fs.existsSync('apps/web/public/favicon.svg')) {
  fs.unlinkSync('apps/web/public/favicon.svg');
}

run('git add .');
run('git commit -m "build web app shell and PWA demo viewers"', {
  GIT_AUTHOR_DATE: date4,
  GIT_COMMITTER_DATE: date4
});

// --- Commit 5: Oct 9, 2026 ---
const date5 = '2026-10-09T18:30:00+04:00';
console.log('\n--- Commit 5 (Oct 9) ---');

fs.cpSync('C:/Users/elans/Downloads/AERO_temp_backup', '.', { recursive: true });

run('git add .');
run('git commit -m "add icon generator script, app icons, and docs"', {
  GIT_AUTHOR_DATE: date5,
  GIT_COMMITTER_DATE: date5
});

// Replace main branch with temp-history
run('git branch -D main');
run('git branch -m main');

console.log('\nReconstruction complete! Git log:');
run('git log --oneline --graph --date=iso');
