// Native SQLite is built for Electron. Run Vitest with that same Node ABI.
const { spawnSync } = require('node:child_process');
const args = process.argv.slice(2);
const result = spawnSync(process.env.INKWELL_ELECTRON_PATH || require('electron'), [
  require.resolve('vitest/vitest.mjs'), ...(args.length ? args : ['run']),
], { stdio: 'inherit', env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' } });
if (result.error) console.error(result.error);
if (result.signal) console.error(`Test runtime terminated by ${result.signal}`);
process.exitCode = result.status ?? 1;
