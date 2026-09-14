const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { detectAbi, ELECTRON_ABI, ELECTRON_TARGET } = require('./ensure-native-abi.cjs');

/**
 * Fail the build if a binary with the wrong ABI made it into the bundle.
 * The rebuild itself happens in beforeBuild (the packaged module has no
 * binding.gyp, so it cannot be rebuilt here); this is a last-line guard.
 */
function verifyPackagedAbi(appPath) {
  const binary = path.join(
    appPath,
    'Contents/Resources/app.asar.unpacked/node_modules/better-sqlite3/build/Release/better_sqlite3.node'
  );
  // A missing binary is fatal, not skippable: the app cannot open its database
  // without it. This also catches app.asar.unpacked being dropped entirely.
  if (!fs.existsSync(binary)) {
    throw new Error(
      `[afterPack] better_sqlite3.node is missing from the bundle (expected at ${binary}). ` +
        `The app would crash on startup. Check that beforeBuild returns true so electron-builder ` +
        `installs production node_modules.`
    );
  }

  const abi = detectAbi(binary);
  if (abi !== String(ELECTRON_ABI)) {
    throw new Error(
      `[afterPack] Packaged better-sqlite3 has ABI ${abi}, but Electron ${ELECTRON_TARGET} requires ${ELECTRON_ABI}. ` +
        `The app would crash on startup with ERR_DLOPEN_FAILED. Run "pnpm rebuild:native" and rebuild.`
    );
  }
  console.log(`[afterPack] Verified packaged better-sqlite3 ABI ${abi}.`);
}

exports.default = async function (context) {
  if (context.electronPlatformName !== 'darwin') return;
  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  const entitlementsPath = path.join(__dirname, 'entitlements.mac.plist');

  verifyPackagedAbi(appPath);

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
