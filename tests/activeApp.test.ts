import { afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ exec: vi.fn() }));
vi.mock('node:child_process', () => ({ execFile: mocks.exec }));
vi.mock('node:fs', () => ({ default: { existsSync: () => false } }));
vi.mock('electron', () => ({ app: { getAppPath: () => '/app' }, BrowserWindow: { getAllWindows: () => [] } }));
vi.mock('../src/main/logger', () => ({ logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn() } }));
import { forceUpdateActiveApp, stopActiveAppTracker } from '../src/main/capture/activeApp';
afterEach(() => { mocks.exec.mockReset(); stopActiveAppTracker(); });
describe.skipIf(process.platform !== 'darwin')('active app helper recovery', () => {
  it('bounds native helper execution and can query again after failure', async () => {
    mocks.exec.mockImplementation((_binary, _args, options, callback) => {
      expect(options.timeout).toBe(2000);
      callback(new Error('timeout'), '');
    });
    await forceUpdateActiveApp();
    await forceUpdateActiveApp();
    expect(mocks.exec).toHaveBeenCalledTimes(2);
  });
  it('ignores an in-flight result after the tracker stops', async () => {
    let complete: any;
    mocks.exec.mockImplementation((_binary, _args, _options, callback) => { complete = callback; });
    const pending = forceUpdateActiveApp();
    stopActiveAppTracker();
    complete(null, JSON.stringify({ owner: { name: 'Stale app', path: '', processId: 12345 } }));
    expect((await pending).name).not.toBe('Stale app');
  });
  it('does not retain another app identity when Inkwell has focus', async () => {
    mocks.exec.mockImplementation((_binary, _args, _options, callback) => {
      callback(null, JSON.stringify({ owner: { name: 'Inkwell', path: '', processId: process.pid } }));
    });
    expect((await forceUpdateActiveApp()).name).toBe('Inkwell');
  });
});
