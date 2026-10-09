import sharp from 'sharp';
import png2icons from 'png2icons';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const desktopResources = path.join(rootDir, 'apps/desktop/resources');
const webIcons = path.join(rootDir, 'apps/web/public/icons');

fs.mkdirSync(desktopResources, { recursive: true });
fs.mkdirSync(webIcons, { recursive: true });

const mainSvg = fs.readFileSync(path.join(desktopResources, 'icon.svg'), 'utf-8');

// 1. Generate Desktop main icons: icon.png (1024x1024), icon-512.png (512x512)
const png1024Buffer = await sharp(Buffer.from(mainSvg))
  .resize(1024, 1024)
  .png()
  .toBuffer();

fs.writeFileSync(path.join(desktopResources, 'icon.png'), png1024Buffer);

const png512Buffer = await sharp(Buffer.from(mainSvg))
  .resize(512, 512)
  .png()
  .toBuffer();

fs.writeFileSync(path.join(desktopResources, 'icon-512.png'), png512Buffer);

// Generate icon.ico and icon.icns using png2icons
const createICO = png2icons.createICO || png2icons.default?.createICO;
const createICNS = png2icons.createICNS || png2icons.default?.createICNS;
const HERMITE = png2icons.HERMITE ?? 0;
const BILINEAR = png2icons.BILINEAR ?? 0;

const icoBuffer = createICO(png1024Buffer, HERMITE, 0);
if (icoBuffer) {
  fs.writeFileSync(path.join(desktopResources, 'icon.ico'), icoBuffer);
} else {
  console.error('Failed to create icon.ico');
}

const icnsBuffer = createICNS(png1024Buffer, BILINEAR, 0);
if (icnsBuffer) {
  fs.writeFileSync(path.join(desktopResources, 'icon.icns'), icnsBuffer);
} else {
  console.error('Failed to create icon.icns');
}

// 2. Tray icons: SVG without squircle background (only ring and dot)
const trayBlackSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="32" height="32">
  <path d="M131.6 84.1 A42 42 0 1 1 95.9 48.4" fill="none" stroke="#000000" stroke-width="12" stroke-linecap="round"/>
  <circle cx="119.7" cy="60.3" r="11" fill="#000000"/>
</svg>`;

const trayWhiteSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="32" height="32">
  <path d="M131.6 84.1 A42 42 0 1 1 95.9 48.4" fill="none" stroke="#FFFFFF" stroke-width="12" stroke-linecap="round"/>
  <circle cx="119.7" cy="60.3" r="11" fill="#FFFFFF"/>
</svg>`;

// trayTemplate.png (16x16) & trayTemplate@2x.png (32x32) - macOS (black)
await sharp(Buffer.from(trayBlackSvg)).resize(16, 16).png().toFile(path.join(desktopResources, 'trayTemplate.png'));
await sharp(Buffer.from(trayBlackSvg)).resize(32, 32).png().toFile(path.join(desktopResources, 'trayTemplate@2x.png'));

// tray.png (16x16) & tray@2x.png (32x32) - Windows / Linux (white)
await sharp(Buffer.from(trayWhiteSvg)).resize(16, 16).png().toFile(path.join(desktopResources, 'tray.png'));
await sharp(Buffer.from(trayWhiteSvg)).resize(32, 32).png().toFile(path.join(desktopResources, 'tray@2x.png'));

// 3. Web icons
// icon-192.png (192x192)
await sharp(Buffer.from(mainSvg)).resize(192, 192).png().toFile(path.join(webIcons, 'icon-192.png'));

// icon-512.png (512x512)
await sharp(Buffer.from(mainSvg)).resize(512, 512).png().toFile(path.join(webIcons, 'icon-512.png'));

// maskable-512.png: 512x512 full-bleed #06080F background, no rounded corners, ring and dot inside center 80%
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="512" height="512">
  <rect width="180" height="180" fill="#06080F"/>
  <g transform="translate(18, 18) scale(0.8)">
    <path d="M131.6 84.1 A42 42 0 1 1 95.9 48.4" fill="none" stroke="#FFFFFF" stroke-width="12" stroke-linecap="round"/>
    <circle cx="119.7" cy="60.3" r="11" fill="#4DA3FF"/>
  </g>
</svg>`;

await sharp(Buffer.from(maskableSvg)).resize(512, 512).png().toFile(path.join(webIcons, 'maskable-512.png'));

// favicon.svg
fs.writeFileSync(path.join(webIcons, 'favicon.svg'), mainSvg);
fs.writeFileSync(path.join(rootDir, 'apps/web/public/favicon.svg'), mainSvg);

console.log('All icons generated successfully!');
