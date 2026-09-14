const { ensureNativeAbi } = require('./ensure-native-abi.cjs');

/**
 * Runs after electron-builder's own native dependency install/rebuild step and
 * before files are copied into the app bundle.
 *
 * @electron/rebuild runs with buildFromSource=false, so better-sqlite3's
 * `prebuild-install` can fetch a prebuilt binary compiled for plain Node
 * instead of Electron. This is the last point where the module still has its
 * binding.gyp and can be rebuilt from source.
 *
 * Must return true: returning false makes electron-builder skip installing
 * production node_modules entirely, which silently drops app.asar.unpacked
 * and every native module from the bundle.
 */
exports.default = async function (context) {
  if (context.platform.nodeName !== 'darwin') return true;

  const { Arch } = require('builder-util');
  const arch = Arch[context.arch] === 'x64' ? 'x64' : 'arm64';

  ensureNativeAbi({ arch });
  return true;
};
