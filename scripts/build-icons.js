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

  // 4. Process Tray template PNGs for macOS menu bar icons
  // macOS setTemplateImage(true) turns all non-transparent pixels into solid tint.
  // Converting any non-transparent pixel in custom/generated tray icon to black + alpha
  // guarantees crisp light/dark mode auto-tinting by macOS.
  const tray1xPath = path.join(iconsDir, 'trayTemplate.png');
  const tray2xPath = path.join(iconsDir, 'trayTemplate@2x.png');
  const tray3xPath = path.join(iconsDir, 'trayTemplate@3x.png');

  const sourceTrayBuffer = fs.existsSync(tray3xPath)
    ? fs.readFileSync(tray3xPath)
    : fs.existsSync(tray2xPath)
    ? fs.readFileSync(tray2xPath)
    : fs.existsSync(tray1xPath)
    ? fs.readFileSync(tray1xPath)
    : null;

  if (sourceTrayBuffer) {
    const makeMonochromeTemplate = async (buffer, width, height) => {
      const { data, info } = await sharp(buffer)
        .resize(width, height)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Transform RGB values to 0 (black) while preserving alpha for macOS menu bar template
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 0;     // R
        data[i + 1] = 0; // G
        data[i + 2] = 0; // B
        // data[i+3] is Alpha (keep intact)
      }

      return sharp(data, {
        raw: { width: info.width, height: info.height, channels: info.channels },
      })
        .png()
        .toBuffer();
    };

    const template1x = await makeMonochromeTemplate(sourceTrayBuffer, 18, 18);
    const template2x = await makeMonochromeTemplate(sourceTrayBuffer, 36, 36);
    const template3x = await makeMonochromeTemplate(sourceTrayBuffer, 54, 54);

    fs.writeFileSync(tray1xPath, template1x);
    fs.writeFileSync(tray2xPath, template2x);
    fs.writeFileSync(tray3xPath, template3x);
    console.log('Created monochrome template icons: trayTemplate.png (18x18), @2x (36x36), @3x (54x54)');
  }

  console.log('Icon generation complete!');
}

buildIcons().catch((err) => {
  console.error('Icon build error:', err);
  process.exit(1);
});
