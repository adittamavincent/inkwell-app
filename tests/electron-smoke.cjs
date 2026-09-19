// Run via scripts/smoke.cjs. All IPC responses below contain synthetic test data.
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = process.env.INKWELL_SMOKE_ROOT;
app.setPath('userData', path.join(process.env.INKWELL_SMOKE_DIR, 'profile'));
app.setName('Inkwell smoke test');
const config = { enabled: false, vaultPath: '', dailyFolderRoot: 'Daily', dayPattern: '%Y-%m-%d', keylogSuffix: ' - keylog', idleTimeoutSecs: 60, excludedApps: [] };
let running = true;
let historyRequests = 0;
let failNextHistory = false;
let pendingHistory;
let holdHistory = false;
const makeSessions = (offset) => Array.from({ length: 100 }, (_, i) => ({
  startId: 1000 - offset - i, endId: 1000 - offset - i,
  start: new Date(1700000000000 - (offset + i) * 60000).toISOString(),
  app: 'Synthetic Notes', text: `Synthetic session ${offset + i}. `.repeat(12),
}));
const handlers = {
  getConfig: () => config,
  getActiveApp: () => ({ name: 'Synthetic Notes', icon: null }),
  getAppIcon: () => null,
  checkPermissions: () => ({ accessibility: 'authorized', inputMonitoring: 'authorized' }),
  getCaptureStatus: () => running,
  toggleCapture: (_event, value) => (running = value),
  getHistory: (_event, params) => {
    historyRequests++;
    if (failNextHistory) { failNextHistory = false; throw new Error('Synthetic database failure'); }
    if (holdHistory) return new Promise((resolve) => { pendingHistory = resolve; });
    const offset = params?.beforeId ? 1001 - params.beforeId : 0;
    return { sessions: makeSessions(offset), hasMore: true, nextBeforeId: 901 - offset };
  },
  clearHistory: () => undefined,
  deleteSession: () => undefined,
  copyToClipboard: () => undefined,
  saveConfig: () => { throw new Error('Synthetic disk full'); },
  forceSync: () => ({ success: false, message: 'Synthetic offline volume' }),
};
for (const [channel, handler] of Object.entries(handlers)) ipcMain.handle(`inkwell:${channel}`, handler);
let win;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const js = (source) => win.webContents.executeJavaScript(source);
async function until(source) {
  for (let n = 0; n < 100; n++) { if (await js(source)) return; await pause(50); }
  throw new Error(`Timed out: ${source}`);
}
(async () => {
  await app.whenReady();
  win = new BrowserWindow({ width: 1040, height: 720, show: true, titleBarStyle: 'hiddenInset', webPreferences: {
    preload: path.join(root, 'dist-electron/preload/index.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true,
  } });
  const { setupTray, updateTrayMenu } = require(path.join(process.env.INKWELL_SMOKE_DIR, 'tray.cjs'));
  const tray = setupTray(() => win, () => { win.show(); win.focus(); });
  updateTrayMenu();
  assert.equal(tray.isDestroyed(), false);
  await win.loadFile(path.join(root, 'dist/index.html'));
  await until("document.body.innerText.includes('Archived Sessions (100)')");
  assert.equal(historyRequests, 1);
  const geometry = await js(`(() => { const list = document.querySelector('main > .overflow-y-auto'); return { height: list.clientHeight, content: list.scrollHeight, noDrag: getComputedStyle(document.querySelector('[title="Pause capture"]')).webkitAppRegion, parentNoDrag: getComputedStyle(document.querySelector('[title="Pause capture"]').parentElement).webkitAppRegion }; })()`);
  assert(geometry.height > 0 && geometry.content > geometry.height, JSON.stringify(geometry));
  assert.equal(geometry.parentNoDrag, 'no-drag');
  await js(`document.querySelector('[title="Pause capture"]').click()`);
  await until("!!document.querySelector('[title=\"Resume capture\"]')");
  await js(`document.querySelector('[title="Sync & Vault settings"]').click()`);
  await until("!!document.querySelector('[aria-label=\"Settings panel\"]')");
  await js(`document.querySelector('form').requestSubmit()`);
  await until("document.body.innerText.includes('Error saving settings')");
  await js(`document.querySelector('[title="Close drawer"]').click()`);
  failNextHistory = true;
  await js(`Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Load older sessions').click()`);
  await until("document.body.innerText.includes('Could not load history')");
  await js(`Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Retry history').click()`);
  await until("document.body.innerText.includes('Archived Sessions (200)')");
  const before = historyRequests;
  holdHistory = true;
  await js(`(() => { const list = document.querySelector('main > .overflow-y-auto'); list.scrollTop = list.scrollHeight; for(let n=0;n<8;n++) list.dispatchEvent(new Event('scroll')); })()`);
  await pause(100);
  assert.equal(historyRequests, before + 1, 'concurrent scroll requests must be coalesced');
  await js(`document.querySelector('[title="Clear all recorded entries"]').click()`);
  await js(`Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Delete Everything').click()`);
  await until("document.body.innerText.includes('Manuscript Archive Empty')");
  pendingHistory({ sessions: makeSessions(200), hasMore: true, nextBeforeId: 700 });
  await pause(150);
  assert(await js("document.body.innerText.includes('Manuscript Archive Empty')"), 'stale response restored cleared history');
  console.log('PASS: native tray creation, renderer loading, header actions, scroll geometry, settings errors, pagination retry, concurrent scroll guard, clear/load race');
  tray.destroy();
  win.destroy();
  app.quit();
})().catch((error) => { console.error(error); app.exit(1); });
