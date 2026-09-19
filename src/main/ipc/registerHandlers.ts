import { ipcMain, clipboard, BrowserWindow } from 'electron';
import {
  isCaptureRunning,
  setCaptureEnabled,
  flushCaptureQueue,
  discardPendingCapture,
} from '../capture/keyHook';
import {
  checkAccessibilityStatus,
  checkInputMonitoringStatus,
  requestAccessibilityAccess,
  requestInputMonitoringAccess,
  openAccessibilitySettings,
  openInputMonitoringSettings,
  PermissionStatus,
} from '../capture/permissions';
import { checkAndSyncPermissionState } from '../capture/permissionWatcher';
import { getFrontmostAppInfo, getOrResolveAppIcon } from '../capture/activeApp';
import { loadHistoryPaginated, clearHistory, deleteSessionEntry } from '../db/repository';
import { getConfig, saveConfig, CogdexSyncConfig } from '../config/store';
import { doSync } from '../sync/cogdexSync';
import { updateTrayMenu } from '../tray/trayManager';

export function registerIpcHandlers(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle('inkwell:getCaptureStatus', () => {
    return isCaptureRunning();
  });

  ipcMain.handle('inkwell:getActiveApp', () => {
    return getFrontmostAppInfo();
  });

  ipcMain.handle('inkwell:getAppIcon', async (_event, appName: string) => {
    return getOrResolveAppIcon(appName);
  });

  ipcMain.handle('inkwell:toggleCapture', (_event, start: boolean) => {
    const running = setCaptureEnabled(start);
    updateTrayMenu();
    return running;
  });

  ipcMain.handle('inkwell:checkPermissions', (): PermissionStatus => {
    const status = checkAndSyncPermissionState();
    updateTrayMenu();
    return status;
  });

  ipcMain.handle('inkwell:requestAccessibility', () => {
    requestAccessibilityAccess();
  });

  ipcMain.handle('inkwell:requestInputMonitoring', () => {
    requestInputMonitoringAccess();
  });

  ipcMain.handle('inkwell:openAccessibilitySettings', () => {
    openAccessibilitySettings();
  });

  ipcMain.handle('inkwell:openInputMonitoringSettings', () => {
    openInputMonitoringSettings();
  });

  ipcMain.handle('inkwell:openSystemSettings', () => {
    openAccessibilitySettings();
  });

  ipcMain.handle('inkwell:getHistory', (_event, params?: { limit?: number; before?: string; beforeId?: number }) => {
    const config = getConfig();
    return loadHistoryPaginated({
      limit: params?.limit ?? 100,
      before: params?.before,
      beforeId: params?.beforeId,
      idleTimeoutSecs: config.idleTimeoutSecs,
    });
  });

  ipcMain.handle('inkwell:clearHistory', () => {
    flushCaptureQueue();
    clearHistory();
    discardPendingCapture();
  });

  ipcMain.handle(
    'inkwell:deleteSession',
    (_event, session: { startIso?: string; endIso?: string; app?: string; start?: any; startId?: number; endId?: number }) => {
      const startIso =
        session.startIso ||
        (session.start instanceof Date ? session.start.toISOString() : String(session.start || ''));
      const endIso = session.endIso || startIso;
      deleteSessionEntry(startIso, endIso, session.app, session.startId, session.endId);
    }
  );

  ipcMain.handle('inkwell:copyToClipboard', (_event, text: string) => {
    clipboard.writeText(text);
  });

  ipcMain.handle('inkwell:getConfig', () => {
    return getConfig();
  });

  ipcMain.handle('inkwell:saveConfig', (_event, newConfig: Partial<CogdexSyncConfig>) => {
    return saveConfig(newConfig);
  });

  ipcMain.handle('inkwell:forceSync', () => {
    const config = getConfig();
    return doSync(config);
  });
}
