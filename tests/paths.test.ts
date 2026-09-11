import { describe, it, expect, beforeEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { getAppDataDir, resetCachedAppDataDir } from '../src/main/storage/paths';

describe('Storage paths configuration', () => {
  beforeEach(() => {
    resetCachedAppDataDir();
  });

  it('uses repository local .inkwell-dev directory during test/dev execution', () => {
    const dataDir = getAppDataDir();
    expect(dataDir).toBe(path.join(process.cwd(), '.inkwell-dev'));
    expect(fs.existsSync(dataDir)).toBe(true);
  });
});
