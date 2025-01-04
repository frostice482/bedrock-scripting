import fsp from 'fs/promises'
import esbuild from 'esbuild'

await fsp.rm('app', { recursive: true, force: true })

await esbuild.build({
	entryPoints: ['src/**/*'],
	outdir: 'app',

	format: 'esm',

	packages: 'external',
	tsconfig: 'tsconfig.json'
})
