const esbuild = require('esbuild');

esbuild.build({
	entryPoints: ['./src/extension.ts'],
	bundle: true,
	outfile: 'dist/extension.js',
	external: ['vscode'],
	format: 'cjs',
	platform: 'node',
	minify: true,
	sourcemap: true,
}).catch(() => process.exit(1));
