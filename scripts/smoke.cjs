const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const esbuild = require(require.resolve('esbuild', { paths: [require.resolve('vite')] }));
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'inkwell-smoke-'));
(async () => {
  try {
    fs.symlinkSync(path.join(root, 'icons'), path.join(temp, 'icons'));
    fs.copyFileSync(path.join(root, 'tests/electron-smoke.cjs'), path.join(temp, 'main.cjs'));
    await esbuild.build({
      entryPoints: [path.join(root, 'src/main/tray/trayManager.ts')], outfile: path.join(temp, 'tray.cjs'),
      bundle: true, platform: 'node', format: 'cjs', external: ['electron'],
      plugins: [{ name: 'synthetic-backends', setup(build) {
        build.onResolve({ filter: /capture\/keyHook|\/lifecycle|\/logger/ }, (args) => ({ path: args.path, namespace: 'synthetic' }));
        build.onLoad({ filter: /.*/, namespace: 'synthetic' }, () => ({ contents: 'export const isCaptureRunning=()=>true; export const setCaptureEnabled=()=>{}; export const requestQuit=()=>{}; export const logger={info(){},getLogPath(){return "";}};' }));
      } }],
    });
    const env = { ...process.env, INKWELL_SMOKE_ROOT: root, INKWELL_SMOKE_DIR: temp };
    delete env.ELECTRON_RUN_AS_NODE;
    const result = spawnSync(process.env.INKWELL_ELECTRON_PATH || require('electron'), [path.join(temp, 'main.cjs')], {
      cwd: root, stdio: 'inherit', env, timeout: 60000,
    });
    if (result.signal) console.error(`Electron terminated by ${result.signal}`);
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
