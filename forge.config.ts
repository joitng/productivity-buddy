import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { WebpackPlugin } from '@electron-forge/plugin-webpack';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import * as path from 'path';
import * as fs from 'fs';

import { mainConfig } from './webpack.main.config';
import { rendererConfig } from './webpack.renderer.config';

// Helper to copy directory recursively
function copyRecursiveSync(src: string, dest: string) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

const config: ForgeConfig = {
  packagerConfig: {
    asar: {
      unpack: '**/{better-sqlite3,bindings,file-uri-to-path}/**/*',
    },
    name: 'Productivity Buddy',
    icon: './assets/icon',
    appBundleId: 'com.productivitybuddy.app',
    appCategoryType: 'public.app-category.productivity',
  },
  rebuildConfig: {},
  hooks: {
    postPackage: async (_config, options) => {
      // Copy native modules to the packaged app
      const nativeModules = ['better-sqlite3', 'bindings', 'file-uri-to-path'];
      const outputPath = options.outputPaths[0];
      const resourcesPath = path.join(outputPath, 'Productivity Buddy.app', 'Contents', 'Resources');
      const unpackedPath = path.join(resourcesPath, 'app.asar.unpacked', 'node_modules');

      // Create unpacked directory
      if (!fs.existsSync(unpackedPath)) {
        fs.mkdirSync(unpackedPath, { recursive: true });
      }

      // Copy each native module
      for (const mod of nativeModules) {
        const srcPath = path.join(__dirname, 'node_modules', mod);
        const destPath = path.join(unpackedPath, mod);
        if (fs.existsSync(srcPath)) {
          console.log(`Copying native module: ${mod}`);
          copyRecursiveSync(srcPath, destPath);
        }
      }

      // Copy .env file to resources
      const envSrc = path.join(__dirname, '.env');
      const envDest = path.join(resourcesPath, '.env');
      if (fs.existsSync(envSrc)) {
        console.log('Copying .env file');
        fs.copyFileSync(envSrc, envDest);
      }
    },
  },
  makers: [
    new MakerSquirrel({}),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new WebpackPlugin({
      mainConfig,
      renderer: {
        config: rendererConfig,
        entryPoints: [
          {
            html: './src/index.html',
            js: './src/renderer/index.tsx',
            name: 'main_window',
            preload: {
              js: './src/preload/index.ts',
            },
          },
          {
            html: './src/checkin-popup/index.html',
            js: './src/checkin-popup/index.tsx',
            name: 'checkin_window',
            preload: {
              js: './src/preload/index.ts',
            },
          },
          {
            html: './src/chunk-end-popup/index.html',
            js: './src/chunk-end-popup/index.tsx',
            name: 'chunk_end_window',
            preload: {
              js: './src/preload/index.ts',
            },
          },
          {
            html: './src/timer-end-popup/index.html',
            js: './src/timer-end-popup/index.tsx',
            name: 'timer_end_window',
            preload: {
              js: './src/preload/index.ts',
            },
          },
          {
            html: './src/winddown-end-popup/index.html',
            js: './src/winddown-end-popup/index.tsx',
            name: 'winddown_end_window',
            preload: {
              js: './src/preload/index.ts',
            },
          },
        ],
      },
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
