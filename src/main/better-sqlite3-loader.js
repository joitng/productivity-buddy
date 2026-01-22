// Shim to load better-sqlite3 from the correct path in packaged app
const path = require('path');
const electron = require('electron');

// Use indirect require to prevent webpack from trying to bundle the native module
const nodeRequire = eval('require');

let betterSqlite3;

if (electron.app.isPackaged) {
  const modulePath = path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'better-sqlite3');
  betterSqlite3 = nodeRequire(modulePath);
} else {
  betterSqlite3 = nodeRequire('better-sqlite3');
}

module.exports = betterSqlite3;
