#!/usr/bin/env node

import { build } from 'esbuild';
import browserslist from 'browserslist';
import { resolveToEsbuildTarget } from 'esbuild-plugin-browserslist';
import { mkdirSync } from 'fs';
import { replace } from 'esbuild-plugin-replace';
import ts from 'typescript';
import { context } from 'esbuild';

console.log(ts.version);

const production = !!process.env.production;

if (production) {
  console.log('🚧🚧🚧 BUILDING FOR PRODUCTION! 🚧🚧🚧');
}
else {
  console.log('🏠🏠🏠 Building for local dev! 🏠🏠🏠');
}

const watch = process.env.WATCH === 'true';

const buildSuccessNotifierPlugin = appName => ({
  name: 'Build success notifier',
  setup(build) {
    build.onEnd(result => {
      if (result.errors.length > 0) {
        // esbuild has already logged the error.
        return;
      }

      console.log(appName + ' build succeeded at ' + new Date().toLocaleTimeString());
    });
  },
});

checkTypes();
bundle();

function checkTypes() {
  const configPath = ts.findConfigFile(
    './',
    ts.sys.fileExists,
    'tsconfig.json'
  );
  if (!configPath) {
    throw new Error('Could not find a valid \'tsconfig.json\'.');
  }

  if (watch) {
    const createProgram = ts.createSemanticDiagnosticsBuilderProgram;
    const host = ts.createWatchCompilerHost(
      configPath,
      {},
      ts.sys,
      createProgram,
      printDiag,
      printDiag,
    );

    ts.createWatchProgram(host);
  }
  else {
    console.log('Checking types');

    const { options, errors: parseConfigFileErrors } = ts.convertCompilerOptionsFromJson(
      ts.parseConfigFileTextToJson(
        configPath,
        ts.readJsonConfigFile(configPath, ts.sys.readFile).text,
      ).config.compilerOptions,
    );
    if (parseConfigFileErrors.length > 0) {
      for (const error of parseConfigFileErrors) printDiag(error);
      process.exit(1);
    }

    const program = ts.createProgram({
      rootNames: ['server/main.ts', 'client/main.tsx'],
      options,
    });

    const diags = ts.getPreEmitDiagnostics(program);

    if (diags.length === 0) {
      console.log('No type errors');
    }
    else {
      for (const diag of diags) printDiag(diag)
      process.exit(1);
    }
  }

  function printDiag(diag) {
    if (diag.file) {
      let { line, character } = ts.getLineAndCharacterOfPosition(diag.file, diag.start);
      let message = ts.flattenDiagnosticMessageText(diag.messageText, "\n");
      console.log(`${diag.file.fileName} (${line + 1},${character + 1}): ${message}`);
    } else {
      console.log(ts.flattenDiagnosticMessageText(diag.messageText, "\n"));
    }
  }
}

function bundle() {
  mkdirSync('out', { recursive: true });

  const buildConfig = {
    server: {
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
      plugins: [
        buildSuccessNotifierPlugin('Server')
      ]
    },
    client: {
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
      plugins: [
        replace({
          'process.env.NODE_ENV': JSON.stringify(production ? 'production' : 'development'),
        }),
        buildSuccessNotifierPlugin('Client'),
      ]
    },
  };

  if (watch) {
    context(buildConfig.server).then(ctx => ctx.watch());
    context(buildConfig.client).then(ctx => ctx.watch());
  }
  else {
    build(buildConfig.server);
    build(buildConfig.client);
  }
}
