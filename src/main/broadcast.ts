import { BrowserWindow } from 'electron';
import { logger } from './logger';

export function broadcast(channel: string, payload?: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    try {
      if (!win.isDestroyed() && !win.webContents.isDestroyed()) {
        win.webContents.send(channel, payload);
      }
    } catch (err) {
      logger.warn('ipc', `Could not deliver ${channel}`, err);
    }
  }
}
