import { app, Menu, nativeImage, Tray, BrowserWindow, shell } from 'electron';
import path from 'node:path';
import { isCaptureRunning, setCaptureEnabled } from '../capture/keyHook';
import { requestQuit } from '../lifecycle';
import { logger } from '../logger';

let tray: Tray | null = null;
let windowTarget: WindowTarget;
let openWindow: (() => void) | undefined;
let menuRunning: boolean | undefined;

function createTrayIcon(): Electron.NativeImage {
  // Load a proper PNG template image for the macOS menu bar.
  // nativeImage.createFromBuffer does NOT support SVG — only PNG/JPEG/BMP.
  // macOS template images automatically adapt to light/dark mode.
  // Resolve relative to the app root so this works in both dev and packaged builds.
  const appRoot = app.getAppPath();
  const iconPath = path.join(appRoot, 'icons', 'trayTemplate.png');
  const img = nativeImage.createFromPath(iconPath);
  img.setTemplateImage(true);
  return img;
}

export type WindowTarget = BrowserWindow | null | (() => BrowserWindow | null);

function resolveWindow(target?: WindowTarget): BrowserWindow | null {
  if (typeof target === 'function') {
    return target();
  }
  return target || null;
}

export function updateTrayMenu(
  target?: WindowTarget,
  onOpenWindow?: () => void
): void {
  if (target !== undefined) windowTarget = target;
  if (onOpenWindow) openWindow = onOpenWindow;
  if (!tray) return;

  const running = isCaptureRunning();
  if (menuRunning === running) return;
  menuRunning = running;
  // Accelerators on a Tray's context menu only function as local key-equivalents while that specific menu is open
  // (macOS-only behavior in Electron — this project targets arm64/darwin exclusively per electron-builder.config.cjs, so this is safe),
  // they are not global shortcuts and won't fire when the menu is closed.
  const contextMenu = Menu.buildFromTemplate([
    {
      label: running ? '● Capturing Keystrokes' : '○ Capture Paused',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: running ? 'Pause Capture' : 'Resume Capture',
      accelerator: 'CommandOrControl+P',
      click: () => {
        setCaptureEnabled(!isCaptureRunning());
        updateTrayMenu();
      },
    },
    {
      label: 'Open Inkwell Window',
      accelerator: 'CommandOrControl+O',
      click: () => {
        if (openWindow) {
          openWindow();
        } else {
          const win = resolveWindow(windowTarget);
          if (win && !win.isDestroyed()) {
            if (win.isMinimized()) win.restore();
            win.show();
            win.focus();
          }
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Show Logs in Finder',
      accelerator: 'CommandOrControl+L',
      click: () => {
        shell.showItemInFolder(logger.getLogPath());
      },
    },
    { type: 'separator' },
    {
      label: 'Quit Inkwell',
      accelerator: 'CommandOrControl+Q',
      click: () => {
        requestQuit('user-tray-quit');
      },
    },
  ]);

  tray.setToolTip(running ? 'Inkwell — Capturing' : 'Inkwell — Paused');
  tray.setContextMenu(contextMenu);
}

export function setupTray(
  target?: WindowTarget,
  onOpenWindow?: () => void
): Tray {
  tray?.destroy();
  tray = new Tray(createTrayIcon());
  menuRunning = undefined;
  updateTrayMenu(target, onOpenWindow);
  // Let the native context menu own clicks. Showing/hiding a Dock window here
  // changes app activation while macOS is tracking the menu.
  logger.info('tray', 'System tray initialized');
  return tray;
}
