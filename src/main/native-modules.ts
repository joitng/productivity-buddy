// Native module loader that works in both development and packaged app
import * as path from 'path';
import { app } from 'electron';

function getNativeModulePath(moduleName: string): string {
  if (app.isPackaged) {
    // In packaged app, native modules are in app.asar.unpacked/node_modules
    return path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', moduleName);
  } else {
    // In development, use regular node_modules
    return moduleName;
  }
}

// Export better-sqlite3 with proper path resolution
// eslint-disable-next-line @typescript-eslint/no-var-requires
export const Database = require(getNativeModulePath('better-sqlite3'));
