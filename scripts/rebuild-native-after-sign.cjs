const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

exports.default = async function (context) {
  if (context.electronPlatformName !== 'darwin') return;

  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  const asarUnpackedPath = path.join(
    appPath,
    'Contents',
    'Resources',
    'app.asar.unpacked'
  );
  const betterSqlitePath = path.join(asarUnpackedPath, 'node_modules', 'better-sqlite3');
  const buildDir = path.join(betterSqlitePath, 'build');
  const electronVersion = context.packager.electronVersion || '33.2.1';

  console.log('[Rebuild Sign] Rebuilding native modules for Electron v' + electronVersion + '...');

  // Clean build directory
  if (fs.existsSync(buildDir)) {
    console.log('[Rebuild Sign] Cleaning build artifacts...');
    try {
      execSync('rm -rf "' + buildDir + '"', { stdio: 'inherit' });
    } catch (e) {}
  }

  // Use node-gyp from pnpm structure
  const nodeGypBin = path.join(__dirname, '../node_modules/.pnpm/node-gyp@9.4.1_bluebird@3.7.2_supports-color@7.2.0/node_modules/node-gyp/bin/node-gyp.js');
  
  if (!fs.existsSync(nodeGypBin)) {
    console.error('[Rebuild Sign] Node-gyp not found!');
    process.exit(1);
  }

  console.log('[Rebuild Sign] Running node-gyp rebuild in:', betterSqlitePath);

  // Execute node-gyp directly via node with proper args
  execSync('cd "' + betterSqlitePath + '" && node "' + nodeGypBin + '" rebuild --release --fetch=electron --target=' + electronVersion + ' --dist-url=https://electronjs.org/headers', { 
    env: Object.assign({}, process.env, { PYTHON: '/usr/bin/python3' }),
    stdio: 'inherit'
  });

  console.log('[Rebuild Sign] Native modules rebuilt successfully for Electron!');
};
