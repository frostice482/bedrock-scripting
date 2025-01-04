// inject src, entryFile, outFile
import fs from 'fs/promises'
import esbuild from 'esbuild'

let bundle = false
let minify = false
let sourcemap = false

for (const arg of process.argv.slice(2)) {
	switch (arg) {
		case 'b':
		case 'bundle':
			bundle = true;
		break
		case 'm':
		case 'minify':
			bundle = true;
		break
		case 's':
		case 'sourcemap':
			bundle = true;
		break
	}
}

await fs.rm('scripts', { recursive: true, force: true })

if (bundle) {
	await esbuild.build({
		entryPoints: [src + '/' + entryFile],
		outfile: 'scripts/' + outFile,

		format: 'esm',
		target: 'es2022',

		bundle,
		minify,
		sourcemap,

		external: [
			"@minecraft/server",
			"@minecraft/server-ui",
			"@minecraft/server-admin",
			"@minecraft/server-gametest",
			"@minecraft/server-net",
			"@minecraft/server-common",
			"@minecraft/server-editor",
			"@minecraft/debug-utilities",
		],
		packages: 'bundle'
	})
}
else {
	await esbuild.build({
		entryPoints: [src + '/**/*'],
		outdir: 'scripts',

		format: 'esm',
		target: 'es2022',

		bundle,
		minify,
		sourcemap,
	})
}