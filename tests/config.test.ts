import { afterAll, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
const storage = vi.hoisted(() => ({ dir: '' }));
vi.mock('../src/main/db/crypto', async () => {
  const fs = await import('node:fs'); const path = await import('node:path'); const os = await import('node:os');
  storage.dir = fs.mkdtempSync(path.join(os.tmpdir(), 'inkwell-config-'));
  return { getAppDataDir: () => storage.dir };
});
import { getConfig, saveConfig, validateConfig, DEFAULT_CONFIG } from '../src/main/config/store';
afterAll(() => fs.rmSync(storage.dir, { recursive: true, force: true }));
describe('settings persistence', () => {
  it('rejects invalid backend input without changing the current config', () => {
    const original = getConfig();
    expect(() => saveConfig({ idleTimeoutSecs: NaN })).toThrow('Invalid settings');
    expect(() => validateConfig({ ...DEFAULT_CONFIG, excludedApps: null as any })).toThrow('Invalid settings');
    expect(getConfig()).toEqual(original);
  });
  it('reports disk errors and keeps the previous config', () => {
    const original = getConfig();
    const write = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => { throw new Error('disk full'); });
    expect(() => saveConfig({ vaultPath: '/different-vault' })).toThrow('disk full');
    expect(getConfig()).toEqual(original);
    write.mockRestore();
  });
  it('preserves explicitly excluded apps across saving', () => {
    expect(saveConfig({ excludedApps: ['Inkwell', 'Private Notes'] }).excludedApps).toEqual(['Inkwell', 'Private Notes']);
  });
});
