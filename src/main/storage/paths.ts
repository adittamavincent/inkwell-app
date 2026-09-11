import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { logger } from '../logger';
import { applyCustomFolderIcon } from './folderIcon';

let cachedAppDataDir: string | null = null;

export function isProductionEnvironment(): boolean {
  if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
    return false;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const electron = require('electron');
    const app = electron.app || electron.default?.app;
    if (app && typeof app.isPackaged === 'boolean') {
      return app.isPackaged;
    }
  } catch {
    // Vitest or non-Electron context
  }
  return process.env.NODE_ENV === 'production';
}

function migrateLegacyFilesIfNeeded(targetDir: string, legacyDir: string): void {
  try {
    if (!fs.existsSync(legacyDir) || targetDir === legacyDir) {
      return;
    }

    const filesToMigrate = ['inkwell.db', 'inkwell.db-wal', 'inkwell.db-shm', 'db.key', 'config.json', 'last_sync.txt'];
    for (const file of filesToMigrate) {
      const src = path.join(legacyDir, file);
      const dst = path.join(targetDir, file);
      if (fs.existsSync(src) && !fs.existsSync(dst)) {
        try {
          fs.copyFileSync(src, dst);
          logger.info('storage', `Migrated legacy storage file ${file} to ${targetDir}`);
        } catch (copyErr) {
          logger.warn('storage', `Failed to migrate ${file}`, copyErr);
        }
      }
    }
  } catch (err) {
    logger.warn('storage', 'Error during legacy data migration', err);
  }
}

export function getAppDataDir(): string {
  if (cachedAppDataDir) return cachedAppDataDir;

  const home = process.env.HOME || os.homedir() || '.';
  const isProd = isProductionEnvironment();

  let selectedDir: string;

  if (!isProd) {
    // Development storage: local to repo in .inkwell-dev
    selectedDir = path.join(process.cwd(), '.inkwell-dev');
    if (!fs.existsSync(selectedDir)) {
      try {
        fs.mkdirSync(selectedDir, { recursive: true });
      } catch {
        selectedDir = path.join(home, '.inkwell-dev');
        fs.mkdirSync(selectedDir, { recursive: true });
      }
    }
    logger.info('storage', `Using DEV storage directory: ${selectedDir}`);
  } else {
    // Production storage: macOS iCloud Drive if available, else Application Support
    const iCloudDocs = path.join(home, 'Library', 'Mobile Documents', 'com~apple~CloudDocs');
    const legacyAppSupport = path.join(home, 'Library', 'Application Support', 'com.inkwell.app');

    if (process.platform === 'darwin' && fs.existsSync(iCloudDocs)) {
      selectedDir = path.join(iCloudDocs, 'Inkwell');
      const isNew = !fs.existsSync(selectedDir);
      try {
        if (isNew) {
          fs.mkdirSync(selectedDir, { recursive: true });
          migrateLegacyFilesIfNeeded(selectedDir, legacyAppSupport);
        }
        applyCustomFolderIcon(selectedDir);
      } catch (err) {
        logger.warn('storage', `Failed to initialize iCloud storage directory at ${selectedDir}, falling back to Application Support`, err);
        selectedDir = legacyAppSupport;
        if (!fs.existsSync(selectedDir)) {
          fs.mkdirSync(selectedDir, { recursive: true });
        }
      }
    } else {
      selectedDir = legacyAppSupport;
      if (!fs.existsSync(selectedDir)) {
        fs.mkdirSync(selectedDir, { recursive: true });
      }
    }
    logger.info('storage', `Using PRODUCTION storage directory: ${selectedDir}`);
  }

  cachedAppDataDir = selectedDir;
  return selectedDir;
}

/**
 * For testing purposes: resets the cached app data dir.
 */
export function resetCachedAppDataDir(): void {
  cachedAppDataDir = null;
}
