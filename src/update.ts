import { Manifest } from './manifest.js'
import { allModules, detectPackageManager, installPackages, packageVersionSelector, semverRegex, semverRegexSimple } from './util.js'
import fsp from 'fs/promises'
import chalk from 'chalk'
import prompts from 'prompts'
import { PackageReleaseType, PackageVersion } from '@frostice482/bedrock-scriptapi-versions'

export default async function update({ to, auto }: UpdateOptions = {}) {
	let manifest: Manifest
	try {
		manifest = JSON.parse(await fsp.readFile('manifest.json', 'utf-8'))
		console.log(manifest.header.name.replace(/\xa7./g, ''), chalk.gray(manifest.header.version))
	} catch {
		throw `manifest.json invalid / not found in ${process.cwd()}`
	}

	// get next version
	const manifestVersion = manifest.header.version
	const nextVerInit = Array.isArray(manifestVersion) ? manifestVersion.slice() : manifestVersion.match(semverRegexSimple)?.slice(1).map(Number) ?? [0, 0, 0]
	nextVerInit[1]!++ // increment minor
	nextVerInit[2]=0 // set patch to 0

	// get next version input
	let cancel = false
	const { nextver } = await prompts([
		{
			type: 'text',
			name: 'nextver',
			message: 'New addon version',
			initial: nextVerInit.join('.'),
			validate: (v) => semverRegex.test(v) || 'Must match semantic versioning'
		}
	], {
		onCancel() { cancel = true }
	})
	if (cancel) return

	// module & other dependencies
	const moduleDepsInit = new Map<string, string>()
	const otherDeps: Manifest.Dependency[] = []

	for (const dep of manifest.dependencies) {
		if (!dep.module_name || !allModules.includes(dep.module_name)) {
			otherDeps.push(dep)
			continue
		}
		const depver = Array.isArray(dep.version) ? dep.version.join('.') : dep.version
		moduleDepsInit.set(dep.module_name, depver)
	}

	// package versions
	const versions = new Map<string, ChangeInfo>()
	const { packagesReleases, mcVersion } = await packageVersionSelector(allModules)

	for (const [pkg, releases] of packagesReleases) {
		const stable = releases.get(PackageReleaseType.RC) ?? releases.get(PackageReleaseType.Stable)
		const beta = releases.get(PackageReleaseType.Beta)
		const old = moduleDepsInit.get(pkg)

		const version = old ? old.endsWith('beta') ? beta ?? stable : stable ?? beta : undefined
		versions.set(pkg, { from: old, to: version, stable, beta })
	}

	let hasChange = true
	while(true) {
		const texts: string[][] = []
		const changed: string[] = []
		const same: string[] = []

		// generate changes
		for (const [pkg, {from, to}] of versions) {
			if (to?.type !== PackageReleaseType.Beta && to?.versionId === from) {
				same.push(pkg)
				continue
			}

			changed.push(pkg)
			texts.push([
				chalk.gray(' :'),
				chalk.blueBright(pkg.padEnd(30)),
				from ? chalk[from.endsWith('beta') ? 'yellow' : 'greenBright'](from.padEnd(15)) : chalk.gray('-'.padEnd(15)),
				'->',
				to ? chalk[to.type === PackageReleaseType.Beta ? 'yellow' : 'greenBright'](to.versionId.padEnd(15)) + chalk.gray(to.raw) : chalk.gray('-')
			])
		}
		hasChange = texts.length !== 0

		// show changes
		if (hasChange) console.log('Module versions changed: \n' + texts.map(v => v.join(' ')).join('\n'))

		// confirm
		const { confirm } = await prompts({
			type: 'select',
			name: 'confirm',
			message: hasChange ? 'Continue?' : 'Nothing to change, continue updating anyway?',
			choices: [
				{ title: 'Yes', value: 0 },
				{ title: 'No, make adjustments', value: 1 },
				{ title: 'Cancel', value: 2 },
			]
		}, {
			onCancel() { cancel = true }
		})
		if (cancel) return
		if (confirm === 0) break
		if (confirm === 2) return

		// adjust each package
		for (const [pkg, obj] of versions) {
			cancel = false
			const { from, to, stable, beta } = obj
			const { value } = await prompts({
				type: 'select',
				name: 'value',
				message: `Select ${chalk.greenBright(pkg)} version to use`,
				choices: [
					{
						title: 'Unused',
						value: undefined,
						description: 'Do not use this module'
					}, {
						title: chalk.greenBright('Stable'),
						value: stable,
						description: `${from ?? '-'} -> ${stable?.versionId ?? '-'}`,
					}, {
						title: chalk.yellowBright('Beta'),
						value: beta,
						description: `${from ?? '-'} -> ${beta?.versionId ?? '-'}`,
					},
				],
				initial: to ? to.type === PackageReleaseType.Beta ? 2 : 1 : 0
			}, {
				onCancel() { cancel = true }
			})
			if (cancel) break

			obj.to = value
		}
	}

	// convert package deps to manifest deps
	const pkgDeps: Manifest.Dependency[] = []
	for (const [pkg, {to}] of versions) {
		if (!to) continue
		pkgDeps.push({
			module_name: pkg,
			version: to.versionId
		})
	}

	console.log('Updating manifest.json')
	// increase manifest versions
	const scriptmodule = manifest.modules.find(v => v.type === 'script')
	if (scriptmodule) scriptmodule.version = nextver
	manifest.header.version = nextver
	// increase min engine version
	if (PackageVersion.compare(manifest.header.min_engine_version, mcVersion.version, 3) < 0)
		manifest.header.min_engine_version = mcVersion.version.slice(0, 3)
	// update dependencies
	manifest.dependencies = otherDeps.concat(pkgDeps)

	await fsp.writeFile('manifest.json', JSON.stringify(manifest, null, '\t'))

	if (hasChange) {
		// determine module to install or uninstall
		const uninstalls: string[] = []
		const installs: string[] = []

		for (const [pkg, { to }] of versions) {
			if (to) installs.push(pkg + '@' + to.raw)
			else uninstalls.push(pkg)
		}

		// detect package manager
		const pacman = await detectPackageManager()
		console.log(`Using ${chalk.blueBright(pacman)}`)

		if (uninstalls.length) await installPackages(pacman, uninstalls, true)
		if (installs.length) await installPackages(pacman, installs)
	}

	return true
}

export interface UpdateOptions {
	to?: string
	auto?: string
}

export interface ChangeInfo {
	from?: string
	to?: PackageVersion
	stable?: PackageVersion
	beta?: PackageVersion
}