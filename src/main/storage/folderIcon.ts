import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { logger } from '../logger';

function resolveIconPath(): string | null {
  const candidates: (string | undefined)[] = [
    path.join(process.cwd(), 'icons', 'icon.icns'),
    path.join(__dirname, '..', '..', '..', 'icons', 'icon.icns'),
    path.join(__dirname, '..', '..', 'icons', 'icon.icns'),
    path.join(__dirname, '..', 'icons', 'icon.icns'),
    process.resourcesPath ? path.join(process.resourcesPath, 'icon.icns') : undefined,
    process.resourcesPath ? path.join(process.resourcesPath, 'icons', 'icon.icns') : undefined,
    process.resourcesPath ? path.join(process.resourcesPath, 'app.asar.unpacked', 'icons', 'icon.icns') : undefined,
  ];

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

export function applyCustomFolderIcon(folderPath: string): void {
  if (process.platform !== 'darwin') return;
  if (!fs.existsSync(folderPath)) return;

  const iconPath = resolveIconPath();
  if (!iconPath) return;

  const jxaScript = `
    function run(argv) {
      ObjC.import("AppKit");
      var img = $.NSImage.alloc.initWithContentsOfFile(argv[0]);
      if (!img) return false;
      return $.NSWorkspace.sharedWorkspace.setIconForFileOptions(img, argv[1], 0);
    }
  `;

  try {
    execFile('osascript', ['-l', 'JavaScript', '-e', jxaScript, iconPath, folderPath], (err) => {
      if (err) {
        logger.debug('storage', `Failed to apply custom folder icon: ${err.message}`);
      } else {
        logger.debug('storage', `Custom folder icon applied to ${folderPath}`);
      }
    });
  } catch (err) {
    logger.debug('storage', 'Could not trigger folder icon script', err);
  }
}
