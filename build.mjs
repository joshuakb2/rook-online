#!/usr/bin/env node

import { build } from 'esbuild';
import browserslist from 'browserslist';
import { resolveToEsbuildTarget } from 'esbuild-plugin-browserslist';
import { mkdirSync } from 'fs';

const production = !!process.env.production;

if (production) {
  console.log('🚧🚧🚧 BUILDING FOR PRODUCTION! 🚧🚧🚧');
}
else {
  console.log('🏠🏠🏠 Building for local dev! 🏠🏠🏠');
}

mkdirSync('out', { recursive: true });

build({
    entryPoints: ['server/main.ts'],
    platform: 'node',
    bundle: true,
    minify: production,
    outfile: 'out/server.js',
    format: 'iife',
    sourcemap: true,
    target: resolveToEsbuildTarget(browserslist('> 0.5%, last 2 versions, not dead'), {
        printUnknownTargets: false,
    }),
}).then(ctx => process.env.WATCH !== 'true' ? null : ctx.watch({
  onRebuild(error, result) {
    if (error) {
      // esbuild has already logged the error.
      return;
    }

    console.log('Server build succeeded at ' + new Date().toLocaleTimeString());
  }
}));

build({
    entryPoints: ['client/main.tsx'],
    bundle: true,
    minify: production,
    outfile: `out/client.js`,
    format: 'iife',
    sourcemap: true,
    banner: { js: 'const global = window;' },
    target: resolveToEsbuildTarget(browserslist('> 0.5%, last 2 versions, not dead'), {
        printUnknownTargets: false,
    }),
}).then(ctx => process.env.WATCH !== 'true' ? null : ctx.watch({
  onRebuild(error, result) {
    if (error) {
      // esbuild has already logged the error.
      return;
    }

    console.log('Server build succeeded at ' + new Date().toLocaleTimeString());
  }
}));
