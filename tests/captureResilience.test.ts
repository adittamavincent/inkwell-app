import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
const mocks = vi.hoisted(() => ({ insert: vi.fn(() => 1), windows: [] as any[] }));
vi.mock('electron', () => ({
  BrowserWindow: { getAllWindows: () => mocks.windows },
  clipboard: { availableFormats: () => [], readText: () => 'pasted text' },
}));
vi.mock('../src/main/db/repository', () => ({ insertKeystroke: mocks.insert }));
vi.mock('../src/main/capture/activeApp', () => ({ getFrontmostAppName: () => 'Notes' }));
vi.mock('../src/main/capture/permissions', () => ({ checkAccessibilityStatus: () => 'authorized', checkInputMonitoringStatus: () => 'authorized' }));
vi.mock('../src/main/config/store', () => ({ getConfig: () => ({ enabled: false, excludedApps: [] }) }));
vi.mock('../src/main/sync/cogdexSync', () => ({ doSync: vi.fn() }));
vi.mock('../src/main/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
import { KEY } from '../src/main/capture/keyMapper';
import { _setHookForTesting, setCaptureEnabled, setCaptureBlocked, startCapture, stopCapture, isCaptureRunning, flushCaptureQueue, discardPendingCapture } from '../src/main/capture/keyHook';

class Hook extends EventEmitter { start = vi.fn(); stop = vi.fn(); }
let hook: Hook;
beforeEach(() => {
  mocks.insert.mockClear(); mocks.windows = [];
  hook = new Hook(); _setHookForTesting(hook);
  setCaptureBlocked('sleep', false); setCaptureBlocked('lock', false);
  setCaptureEnabled(true);
});
afterEach(() => { stopCapture(); discardPendingCapture(); vi.useRealTimers(); });
describe('capture lifecycle and queue', () => {
  it('preserves a manual pause across sleep, unlock and permission recovery', () => {
    setCaptureEnabled(false);
    setCaptureBlocked('sleep', true); setCaptureBlocked('sleep', false);
    startCapture();
    expect(isCaptureRunning()).toBe(false);
    setCaptureEnabled(true);
    expect(isCaptureRunning()).toBe(true);
  });
  it('waits for both lock and sleep blockers to clear', () => {
    setCaptureBlocked('lock', true); setCaptureBlocked('sleep', true);
    setCaptureBlocked('sleep', false);
    expect(isCaptureRunning()).toBe(false);
    setCaptureBlocked('lock', false);
    expect(isCaptureRunning()).toBe(true);
  });
  it('resolves paste on its own queued item before a later key drains the queue', () => {
    hook.emit('keydown', { keycode: KEY.Meta });
    hook.emit('keydown', { keycode: KEY.V });
    hook.emit('keyup', { keycode: KEY.Meta });
    hook.emit('keydown', { keycode: KEY.A });
    flushCaptureQueue();
    const tokens = mocks.insert.mock.calls.map((args: any[]) => args[2]);
    expect(tokens).toEqual(['[PASTE:b64:cGFzdGVkIHRleHQ=]', 'a']);
  });
  it('persists queued keys even if one renderer has been destroyed', () => {
    const send = vi.fn();
    mocks.windows = [
      { isDestroyed: () => false, webContents: { isDestroyed: () => false, send: () => { throw new Error('gone'); } } },
      { isDestroyed: () => false, webContents: { isDestroyed: () => false, send } },
    ];
    hook.emit('keydown', { keycode: KEY.A });
    stopCapture();
    expect(mocks.insert).toHaveBeenCalledOnce();
    expect(send).toHaveBeenCalledWith('inkwell:keystroke', expect.objectContaining({ keyChar: 'a' }));
  });
  it('pauses on a storage failure and retries the original key without rereading the clipboard', () => {
    vi.useFakeTimers();
    mocks.insert.mockImplementationOnce(() => { throw new Error('disk unavailable'); });
    hook.emit('keydown', { keycode: KEY.A });
    flushCaptureQueue();
    expect(isCaptureRunning()).toBe(false);
    expect(mocks.insert).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(2000);
    expect(mocks.insert).toHaveBeenCalledTimes(2);
    expect((mocks.insert.mock.calls[1] as any[])[2]).toBe('a');
    expect(isCaptureRunning()).toBe(false);
  });

});
