import { describe, it, expect, beforeEach } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { getAppDataDir, resetCachedAppDataDir } from '../src/main/storage/paths';

describe('Storage paths configuration', () => {
  beforeEach(() => {
    resetCachedAppDataDir();
  });

  it('uses home directory .inkwell-dev directory during test/dev execution', () => {
    const dataDir = getAppDataDir();
    const home = process.env.HOME || os.homedir() || '.';
    expect(dataDir).toBe(path.join(home, '.inkwell-dev'));
    expect(fs.existsSync(dataDir)).toBe(true);
  });
});
