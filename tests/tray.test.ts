import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ running: false, template: [] as any[], tray: null as any }));
vi.mock('electron', () => ({
  app: { getAppPath: () => '/app' },
  nativeImage: { createFromPath: () => ({ setTemplateImage: vi.fn() }) },
  Menu: { buildFromTemplate: vi.fn((template) => { state.template = template; return template; }) },
  Tray: class {
    on = vi.fn(); destroy = vi.fn(); setToolTip = vi.fn(); setContextMenu = vi.fn();
    constructor() { state.tray = this; }
  },
  shell: { showItemInFolder: vi.fn() },
}));
vi.mock('../src/main/capture/keyHook', () => ({
  isCaptureRunning: () => state.running,
  setCaptureEnabled: (running: boolean) => { state.running = running; },
}));
vi.mock('../src/main/lifecycle', () => ({ requestQuit: vi.fn() }));
vi.mock('../src/main/logger', () => ({ logger: { info: vi.fn(), getLogPath: () => '/logs' } }));
import { setupTray, updateTrayMenu } from '../src/main/tray/trayManager';

describe('tray menu ownership', () => {
  beforeEach(() => { state.running = false; });
  it('keeps the opener after status updates and resolves a replacement window', () => {
    const open = vi.fn();
    setupTray(() => null, open);
    state.running = true;
    updateTrayMenu();
    state.template.find((item) => item.label === 'Open Inkwell Window').click();
    expect(open).toHaveBeenCalledOnce();
  });
  it('does not change window activation during a native tray click', () => {
    setupTray(() => null, vi.fn());
    expect(state.tray.on).not.toHaveBeenCalledWith('click', expect.anything());
  });
  it('leaves an unchanged menu intact during permission polling', () => {
    setupTray(() => null, vi.fn());
    updateTrayMenu();
    updateTrayMenu();
    expect(state.tray.setContextMenu).toHaveBeenCalledOnce();
  });
  it('toggles the current capture state and refreshes the menu', () => {
    setupTray(() => null, vi.fn());
    state.template.find((item) => item.label === 'Resume Capture').click();
    expect(state.running).toBe(true);
    expect(state.template.some((item) => item.label === 'Pause Capture')).toBe(true);
  });
});
