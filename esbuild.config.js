const esbuild = require('esbuild');

const watch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const buildOptions = {
  entryPoints: ['./src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  external: [
    'vscode',
    'ftp',
    'ssh2',
    'ssh2-sftp-client',
    'path',
    'fs'
  ],
  format: 'cjs',
  platform: 'node',
  sourcemap: true,
  minify: process.env.NODE_ENV === 'production',
};

if (watch) {
  esbuild.context(buildOptions).then(context => {
    context.watch();
  }).catch(() => process.exit(1));
} else {
  esbuild.build(buildOptions).catch(() => process.exit(1));
} 