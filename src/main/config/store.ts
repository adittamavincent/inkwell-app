import fs from 'node:fs';
import path from 'node:path';
import { getAppDataDir } from '../db/crypto';
import { logger } from '../logger';
import {
  CogdexSyncConfig,
  DEFAULT_CONFIG,
  DEFAULT_EXCLUDED_APPS,
} from '../../shared/constants';

export type { CogdexSyncConfig };
export { DEFAULT_CONFIG, DEFAULT_EXCLUDED_APPS };

const CONFIG_FILE = 'config.json';
let currentConfig: CogdexSyncConfig = { ...DEFAULT_CONFIG };

export function loadConfig(): CogdexSyncConfig {
  try {
    const configPath = path.join(getAppDataDir(), CONFIG_FILE);
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf8');
      const parsed = JSON.parse(raw);
      currentConfig = validateConfig({ ...DEFAULT_CONFIG, ...parsed });
      return currentConfig;
    }
  } catch (err) {
    logger.warn('config', 'Could not read config file, using defaults', err);
  }
  currentConfig = { ...DEFAULT_CONFIG };
  return currentConfig;
}

export function validateConfig(value: CogdexSyncConfig): CogdexSyncConfig {
  if (typeof value.enabled !== 'boolean' ||
      !['vaultPath', 'dailyFolderRoot', 'dayPattern', 'keylogSuffix'].every((key) => typeof value[key as keyof CogdexSyncConfig] === 'string') ||
      !Number.isFinite(value.idleTimeoutSecs) || value.idleTimeoutSecs < 1 || value.idleTimeoutSecs > 3600 ||
      !Array.isArray(value.excludedApps) || !value.excludedApps.every((entry) => typeof entry === 'string')) {
    throw new Error('Invalid settings');
  }
  return {
    enabled: value.enabled, vaultPath: value.vaultPath, dailyFolderRoot: value.dailyFolderRoot,
    dayPattern: value.dayPattern, keylogSuffix: value.keylogSuffix,
    idleTimeoutSecs: value.idleTimeoutSecs, excludedApps: [...value.excludedApps],
  };
}

export function saveConfig(newConfig: Partial<CogdexSyncConfig>): CogdexSyncConfig {
  const nextConfig = validateConfig({ ...currentConfig, ...newConfig });
  const configPath = path.join(getAppDataDir(), CONFIG_FILE);
  const temporaryPath = `${configPath}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(nextConfig, null, 2), 'utf8');
  fs.renameSync(temporaryPath, configPath);
  currentConfig = nextConfig;
  return currentConfig;
}

export function getConfig(): CogdexSyncConfig {
  return currentConfig;
}
