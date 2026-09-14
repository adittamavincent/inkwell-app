const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Electron 33.2.1 ships Node ABI (NODE_MODULE_VERSION) 130.
// The local system Node is a different ABI, so any .node built by a plain
// `npm/pnpm rebuild` will fail at runtime with ERR_DLOPEN_FAILED.
const ELECTRON_TARGET = '33.2.1';
const ELECTRON_ABI = 130;

/**
 * Locate node-gyp. pnpm does not hoist it to the root node_modules, so a plain
 * require.resolve from the project root fails; fall back to scanning .pnpm.
 */
function resolveNodeGyp() {
  const root = path.join(__dirname, '..');
  try {
    return require.resolve('node-gyp/bin/node-gyp.js', { paths: [root] });
  } catch {
    // fall through to .pnpm scan
  }

  const pnpmDir = path.join(root, 'node_modules/.pnpm');
  if (fs.existsSync(pnpmDir)) {
    const candidates = fs
      .readdirSync(pnpmDir)
      .filter((d) => d.startsWith('node-gyp@'))
      .sort()
      .reverse()
      .map((d) => path.join(pnpmDir, d, 'node_modules/node-gyp/bin/node-gyp.js'))
      .filter((p) => fs.existsSync(p));
    if (candidates.length) return candidates[0];
  }

  throw new Error('[afterPack] Could not locate node-gyp to rebuild native modules.');
}

/**
 * Verify the packaged better-sqlite3 binary targets Electron's ABI, and
 * rebuild it in place if it does not. Runs BEFORE codesigning, because
 * replacing a binary after signing invalidates the app signature.
 */
function ensureNativeAbi(appPath) {
  const moduleDir = path.join(
    appPath,
    'Contents/Resources/app.asar.unpacked/node_modules/better-sqlite3'
  );
  const binary = path.join(moduleDir, 'build/Release/better_sqlite3.node');

  if (!fs.existsSync(binary)) {
    console.warn(`[afterPack] better_sqlite3.node not found at ${binary}; skipping ABI check.`);
    return;
  }

  // The binary reports its own ABI when a mismatched runtime tries to load it.
  const probe = `try{process.dlopen({exports:{}},${JSON.stringify(binary)});console.log(process.versions.modules)}catch(e){const m=/NODE_MODULE_VERSION (\\d+)/.exec(e.message);console.log(m?m[1]:'unknown')}`;
  const actualAbi = execSync(`node -e ${JSON.stringify(probe)}`).toString().trim();

  if (actualAbi === String(ELECTRON_ABI)) {
    console.log(`[afterPack] better-sqlite3 ABI ${actualAbi} matches Electron ${ELECTRON_TARGET}.`);
    return;
  }

  console.log(
    `[afterPack] ABI mismatch: better-sqlite3 is ${actualAbi}, Electron ${ELECTRON_TARGET} needs ${ELECTRON_ABI}. Rebuilding...`
  );

  const nodeGyp = resolveNodeGyp();

  execSync(
    `node "${nodeGyp}" rebuild --release --arch=${context_arch()} --target=${ELECTRON_TARGET} --dist-url=https://electronjs.org/headers`,
    {
      cwd: moduleDir,
      env: { ...process.env, PYTHON: process.env.PYTHON || '/usr/bin/python3' },
      stdio: 'inherit',
    }
  );

  const rebuiltAbi = execSync(`node -e ${JSON.stringify(probe)}`).toString().trim();
  if (rebuiltAbi !== String(ELECTRON_ABI)) {
    throw new Error(
      `[afterPack] Rebuild produced ABI ${rebuiltAbi}, expected ${ELECTRON_ABI}. Aborting to avoid shipping a broken app.`
    );
  }
  console.log(`[afterPack] Rebuilt better-sqlite3 for Electron ABI ${ELECTRON_ABI}.`);
}

// electron-builder exposes arch as an enum; map to a node-gyp arch string.
let currentArch = 'arm64';
function context_arch() {
  return currentArch;
}

exports.default = async function (context) {
  if (context.electronPlatformName !== 'darwin') return;
  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  const entitlementsPath = path.join(__dirname, 'entitlements.mac.plist');

  const { Arch } = require('builder-util');
  currentArch = Arch[context.arch] === 'x64' ? 'x64' : 'arm64';

  ensureNativeAbi(appPath);

  const hasSigningIdentity = !!process.env.CSC_NAME;
  if (hasSigningIdentity) {
    console.log(`[afterPack] CSC_NAME set ("${process.env.CSC_NAME}"); skipping re-sign, stripping quarantine only.`);
    execSync(`xattr -cr "${appPath}"`, { stdio: 'inherit' });
    return;
  }

  console.log(`[afterPack] No CSC_NAME; signing ${appPath} locally and stripping quarantine...`);
  try {
    execSync(`codesign --force --deep --sign "Inkwell Dev" --entitlements "${entitlementsPath}" "${appPath}"`, { stdio: 'inherit' });
    execSync(`xattr -cr "${appPath}"`, { stdio: 'inherit' });
    console.log('[afterPack] Successfully signed with Inkwell Dev and stripped quarantine.');
  } catch (err) {
    console.warn('[afterPack] Inkwell Dev sign failed, falling back to ad-hoc codesign:', err.message);
    execSync(`codesign --force --deep --sign - --entitlements "${entitlementsPath}" "${appPath}"`, { stdio: 'inherit' });
    execSync(`xattr -cr "${appPath}"`, { stdio: 'inherit' });
  }
};
