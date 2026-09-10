import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import png2icons from 'png2icons';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const iconsDir = path.join(rootDir, 'icons');
const svgPath = path.join(iconsDir, 'logo.svg');

async function buildIcons() {
  console.log('Generating icons from SVG:', svgPath);

  if (!fs.existsSync(svgPath)) {
    throw new Error(`SVG file not found at ${svgPath}`);
  }

  const svgBuffer = fs.readFileSync(svgPath);

  // 1. Generate high-res 1024x1024 PNG for icon.icns & app usage
  const png1024 = await sharp(svgBuffer)
    .resize(1024, 1024)
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(iconsDir, 'logo.png'), png1024);
  console.log('Created icons/logo.png (1024x1024)');

  // 2. Generate macOS .icns file
  const icnsBuffer = png2icons.createICNS(png1024, png2icons.BILINEAR, 0);
  if (icnsBuffer) {
    fs.writeFileSync(path.join(iconsDir, 'icon.icns'), icnsBuffer);
    console.log('Created icons/icon.icns');
  } else {
    console.error('Failed to create icon.icns');
  }

  // 3. Generate Windows .ico file (optional/good practice)
  const icoBuffer = png2icons.createICO(png1024, png2icons.BILINEAR, 0, true);
  if (icoBuffer) {
    fs.writeFileSync(path.join(iconsDir, 'icon.ico'), icoBuffer);
    console.log('Created icons/icon.ico');
  }

  // 4. Generate Tray template PNGs (macOS menu bar icons - monochrome template icons)
  // Standard template: 18x18 (or 22x22 on macOS), @2x: 36x36
  const tray1x = await sharp(svgBuffer)
    .resize(18, 18)
    .png()
    .toBuffer();

  const tray2x = await sharp(svgBuffer)
    .resize(36, 36)
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(iconsDir, 'trayTemplate.png'), tray1x);
  fs.writeFileSync(path.join(iconsDir, 'trayTemplate@2x.png'), tray2x);
  console.log('Created icons/trayTemplate.png and icons/trayTemplate@2x.png');

  console.log('Icon generation complete!');
}

buildIcons().catch((err) => {
  console.error('Icon build error:', err);
  process.exit(1);
});
