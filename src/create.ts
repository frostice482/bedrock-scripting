import { PackageVersion, PackageReleaseType } from "@frostice482/bedrock-scriptapi-versions"
import chalk from "chalk"
import fsp from "fs/promises"
import prompts from "prompts"
import { Manifest } from "./manifest.js"
import { detectPackageManager, installPackages, semverRegex } from "./util.js"

export default async function create({ skipPackages = false }: CreateOptions = {}) {
	let cancel = false
    const res = await prompts([
		{
			type: 'text',
			name: 'name',
			message: 'Addon name',
			initial: 'My Addon'
		}, {
			type: 'text',
			name: 'desc',
			message: 'Addon description',
			initial: 'A very cool addon'
		}, {
			type: 'text',
			name: 'version',
			message: 'Addon version',
			initial: '1.0.0',
			validate: (v) => semverRegex.test(v) || 'Must match semantic versioning'
		}, {
			type: 'select',
			name: 'mode',
			message: 'Select mode',
			choices: [
				{ title: 'Simple', value: 'simple', description: 'Recommended for beginners' },
				{ title: 'Advanced', value: 'full', description: 'More options' },
			]
		}
    ], {
		onCancel() { cancel = true }
	})
	if (cancel) return

	let entryFile = 'index.js'
	let useEval = false
	let mcVersion = PackageVersion.MCVersion(PackageVersion.MCReleaseType.Stable, [1, 20, 0])
	let moduleVersions: Map<string, PackageVersion>
	let additionalPackages: string[] = []

	// full setup
	if (res.mode === 'full') {
		const full = await import("./create_full.js").then(v => v.default(skipPackages))
		if (!full) return

		moduleVersions = full.selectedVersions
		entryFile = full.entryFileName + '.js'
		useEval = full.useEval
		if (full.mcVersion) mcVersion = full.mcVersion
		if (full.installTs) additionalPackages.push('typescript')
		if (full.installEsbuild) additionalPackages.push('esbuild')
	}
	// simple setup
	else {
		const simple = await import("./create_simple.js").then(v => v.default(skipPackages))
		if (!simple) return

		moduleVersions = simple.selectedVersions
		if (simple.mcVersion) mcVersion = simple.mcVersion
	}

	// save manifest
	console.log('Generating manifest.json')
	const manifest: Manifest = {
		format_version: 2,
		header: {
			name: res.name,
			description: res.desc,
			uuid: crypto.randomUUID(),
			version: res.version,
			min_engine_version: mcVersion.version.slice(0, 3)
		},
		modules: [{
			type: 'script',
			uuid: crypto.randomUUID(),
			version: res.version,
			entry: 'scripts/' + entryFile
		}],
		dependencies: Array.from(moduleVersions, ([pkg, ver]) => ({
			module_name: pkg,
			version: ver.versionId
		})),
		capabilities: useEval ? ['script_eval'] : []
	}
	await fsp.writeFile('manifest.json', JSON.stringify(manifest, null, '\t'))

	// log modules to install
	console.log(
		'Modules to install:',
		!moduleVersions.size ? 'none' : '\n' + Array.from(moduleVersions, ([pkg, ver]) => [
			chalk.gray(' :'),
			chalk.blueBright(pkg.padEnd(30)),
			chalk[ver.type === PackageReleaseType.Beta ? 'yellow' : 'greenBright'](ver.versionId.padEnd(15)),
			chalk.gray(ver.raw)
		].join(' ')).join('\n')
	)

	// log additional packages
	if (additionalPackages) console.log('Additional packages: ' + additionalPackages.map(v => chalk.blueBright(v)).join(', '))

	// convert module versions to raw and push
	additionalPackages.push(...Array.from(moduleVersions, ([pkg, ver]) => pkg + '@' + ver.raw))

	// detect package manager
	const pacman = await detectPackageManager()
	console.log(`Using ${chalk.blueBright(pacman)}`)

	// install packages
	await installPackages(pacman, additionalPackages)

	console.log('Done')
	return true
}

export interface CreateOptions {
	skipPackages?: boolean
}