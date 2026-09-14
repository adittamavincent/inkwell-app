const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Electron 33.2.1 ships Node ABI (NODE_MODULE_VERSION) 130.
// The local system Node has a different ABI, and `prebuild-install` (used by
// better-sqlite3's install script) will happily download a prebuilt binary
// built for plain Node. That binary then fails at runtime with
// ERR_DLOPEN_FAILED. This module verifies the ABI and rebuilds from source.
const ELECTRON_TARGET = '33.2.1';
const ELECTRON_ABI = 130;

const ROOT = path.join(__dirname, '..');
const MODULE_DIR = path.join(ROOT, 'node_modules/better-sqlite3');
const BINARY = path.join(MODULE_DIR, 'build/Release/better_sqlite3.node');

/**
 * Locate node-gyp. pnpm does not hoist it to the root node_modules, so a plain
 * require.resolve from the project root fails; fall back to scanning .pnpm and
 * prefer the newest version available.
 */
function resolveNodeGyp() {
  try {
    return require.resolve('node-gyp/bin/node-gyp.js', { paths: [ROOT] });
  } catch {
    // fall through to .pnpm scan
  }

  const pnpmDir = path.join(ROOT, 'node_modules/.pnpm');
  if (fs.existsSync(pnpmDir)) {
    const candidates = fs
      .readdirSync(pnpmDir)
      .filter((d) => /^node-gyp@\d/.test(d))
      .sort((a, b) => {
        const v = (s) => parseInt(s.split('@')[1], 10) || 0;
        return v(b) - v(a);
      })
      .map((d) => path.join(pnpmDir, d, 'node_modules/node-gyp/bin/node-gyp.js'))
      .filter((p) => fs.existsSync(p));
    if (candidates.length) return candidates[0];
  }

  throw new Error('Could not locate node-gyp to rebuild native modules.');
}

/**
 * Read the ABI a compiled .node binary was built against.
 *
 * Do not trust better-sqlite3's build/Release/.forge-meta file: @electron/rebuild
 * writes the *intended* ABI there even when prebuild-install supplied a binary
 * for a different one, so it can claim "130" while the binary is really 147.
 * Loading the binary is the only source of truth.
 */
function detectAbi(binaryPath) {
  const probe =
    `try{process.dlopen({exports:{}},${JSON.stringify(binaryPath)});` +
    `console.log(process.versions.modules)}` +
    `catch(e){const m=/NODE_MODULE_VERSION (\\d+)/.exec(e.message);console.log(m?m[1]:'unknown')}`;
  return execSync(`node -e ${JSON.stringify(probe)}`).toString().trim();
}

/**
 * Ensure node_modules/better-sqlite3 is compiled for Electron's ABI.
 * Must run BEFORE electron-builder copies files into the app bundle: the
 * packaged module has no binding.gyp (only the .node is asar-unpacked), so it
 * cannot be rebuilt in place.
 */
function ensureNativeAbi({ arch = 'arm64' } = {}) {
  if (!fs.existsSync(BINARY)) {
    console.warn(`[native-abi] ${BINARY} not found; skipping ABI check.`);
    return;
  }

  const actual = detectAbi(BINARY);
  if (actual === String(ELECTRON_ABI)) {
    console.log(`[native-abi] better-sqlite3 ABI ${actual} matches Electron ${ELECTRON_TARGET}.`);
    return;
  }

  console.log(
    `[native-abi] ABI mismatch: better-sqlite3 is ${actual}, Electron ${ELECTRON_TARGET} needs ${ELECTRON_ABI}. Rebuilding from source...`
  );

  const nodeGyp = resolveNodeGyp();
  execSync(
    `node "${nodeGyp}" rebuild --release --arch=${arch} --target=${ELECTRON_TARGET} --dist-url=https://electronjs.org/headers`,
    {
      cwd: MODULE_DIR,
      env: { ...process.env, PYTHON: process.env.PYTHON || '/usr/bin/python3' },
      stdio: 'inherit',
    }
  );

  const rebuilt = detectAbi(BINARY);
  if (rebuilt !== String(ELECTRON_ABI)) {
    throw new Error(
      `[native-abi] Rebuild produced ABI ${rebuilt}, expected ${ELECTRON_ABI}. Aborting to avoid shipping a broken app.`
    );
  }
  console.log(`[native-abi] Rebuilt better-sqlite3 for Electron ABI ${ELECTRON_ABI}.`);
}

module.exports = { ensureNativeAbi, detectAbi, ELECTRON_ABI, ELECTRON_TARGET, BINARY };
