import { PackageVersion, PackageReleaseType } from "@frostice482/bedrock-scriptapi-versions"
import chalk from "chalk"
import fs from "fs"
import fsp from "fs/promises"
import path from "path"
import prompts from "prompts"
import { packageVersionSelector, choicesConfirm, allModules } from "./util.js"

export default async function createFull(skipPackages = false) {
	const selectedVersions = new Map<string, PackageVersion>()
	let cancel = false
	let mcv

	if (!skipPackages) {
		const { packagesReleases, mcVersion } = await packageVersionSelector(allModules)
		mcv = mcVersion
		// module selection
		for (const [pkg, releases] of packagesReleases) {
			const stable = releases.get(PackageReleaseType.RC) ?? releases.get(PackageReleaseType.Stable)
			const beta = releases.get(PackageReleaseType.Beta)

			const { value } = await prompts({
				type: 'select',
				name: 'value',
				message: `Select ${chalk.greenBright(pkg)} version to use`,
				choices: [
					{
						title: 'Unused',
						value: 'unused',
						description: 'Do not use this module'
					}, {
						title: chalk.greenBright('Stable'),
						value: 'stable',
						description: `Stable release (${stable?.versionString})`,
						disabled: !stable
					}, {
						title: chalk.yellowBright('Beta'),
						value: 'beta',
						description: `Beta release (${beta?.versionString})`,
						disabled: !beta
					},
				],
				initial: pkg === '@minecraft/server' || pkg === '@minecraft/server-ui' ? 1 : 0
			}, {
				onCancel() { cancel = true }
			})
			if (cancel) return

			switch (value) {
				case 'stable':
					if (stable) selectedVersions.set(pkg, stable)
				break
				case 'beta':
					if (beta) selectedVersions.set(pkg, beta)
				break
			}
		}
	}

	// more options
	const { entryInput, useTs, installTs, useInstallEsbuild, srcFolder = 'scripts', useEval } = await prompts([
		{
			type: 'text',
			name: 'entryInput',
			message: 'Entry file (without extension)',
			initial: 'index'
		}, {
			type: 'select',
			name: 'useEval',
			message: 'Use eval?',
			choices: choicesConfirm,
			initial: 1,
		}, {
			type: 'select',
			name: 'useTs',
			message: 'Use Typescript?',
			choices: choicesConfirm,
			initial: 1,
		}, {
			type: (prev, values) => !skipPackages && values.useTs ? 'select' : null,
			name: 'installTs',
			message: 'Install Typescript?',
			choices: choicesConfirm,
		}, {
			type: !skipPackages ? 'select' : null,
			name: 'useInstallEsbuild',
			message: 'Use & install Esbuild?',
			choices: choicesConfirm,
			initial: (prev, values) => values.useTs ? 0 : 1
		}, {
			type: (prev, values) => values.useTs || values.useInstallEsbuild ? 'text' : null,
			name: 'srcFolder',
			message: 'Source folder',
			initial: 'src'
		}
	], {
		onCancel() { cancel = true }
	})
	if (cancel) return

	// workspace setup
	console.log('Creating workspace')
	const sourceFile = entryInput + (useTs ? '.ts' : '.js')
	const scriptEntryFile = entryInput + '.js'

	const workspaceInit = await Promise.allSettled([
		// create scripts & copy entry file
		(async() => {
			await fsp.mkdir(srcFolder + '/' + path.dirname(entryInput), { recursive: true })
			await fsp.cp(new URL('../res/entry.js', import.meta.url), srcFolder + '/' + sourceFile)

			if (useTs) await fsp.cp(new URL('../res/types.d.ts', import.meta.url), srcFolder + '/types.d.ts')
		})(),

		// tsconfig
		useTs && (async() => {
			const data = await fsp.readFile(new URL('../res/tsconfig.json', import.meta.url), 'utf-8')

			const tsconfig = JSON.parse(data)
			tsconfig.include = [srcFolder]
			tsconfig.compilerOptions.rootDir = srcFolder

			await fsp.writeFile('tsconfig.json', JSON.stringify(tsconfig, null, '\t'))
		})(),

		// esbuild
		useInstallEsbuild && (() => {
			const wstr = fs.createWriteStream('build.mjs')
			// inject src, entryFile, outFile
			wstr.write(`var src = ${JSON.stringify(srcFolder)}, entryFile = ${JSON.stringify(sourceFile)}, outFile = ${JSON.stringify(scriptEntryFile)};\n`)

			const rstr = fs.createReadStream(new URL('../res/build.mjs', import.meta.url))
			rstr.pipe(wstr)
			rstr.once('error', () => {})
		})()
	])
	workspaceInit.filter(v => v.status === 'rejected').forEach(console.warn)

	return {
		selectedVersions,
		mcVersion: mcv,
		installTs,
		installEsbuild: useInstallEsbuild,
		entryFileName: scriptEntryFile,
		useEval: useEval
	}
}