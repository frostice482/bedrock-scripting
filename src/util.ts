import { MinecraftVersions, PackageVersion, PackagesVersionSets } from "@frostice482/bedrock-scriptapi-versions"
import chalk from 'chalk'
import cp from 'child_process'
import events from 'events'
import os from "os"
import prompts from "prompts"
import util from "util"

export const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/
export const semverRegexSimple = /^(\d+)\.(\d+)\.(\d+)/

export const cp_exec_prm = util.promisify(cp.exec)

export async function versionSelector(versions: MinecraftVersions, minver: number[] = [0, 0, 0]) {
	const list = [...versions.stables.values(), ...versions.previews.values()]
		.filter(v => PackageVersion.compare(v.version, minver) >= 0)
		.sort(PackageVersion.compareMc)
		.reverse()

	const res = await prompts({
		type: 'autocomplete',
		name: 'version',
		message: 'Select Minecraft version',
		choices: [
			{
				title: `Latest Stable ${versions.latestStable.versionString}`,
				value: versions.latestStable
			},
			{
				title: `Latest Preview ${versions.latestPreview.versionString}`,
				value: versions.latestPreview
			},
			...list.map(ver => ({
				title: PackageVersion.MCReleaseType[ver.type] + ' ' + ver.versionString,
				value: ver
			}))
		]
	})

	return res.version as PackageVersion.MCVersion
}

export async function packageVersionSelector(packages: string[]) {
	const packageVersionSets = await PackagesVersionSets.from(packages, true)
	const mcVersion = await versionSelector(packageVersionSets.getMcVersions())

	const packagesReleases = packageVersionSets.getMcVersionReleases(mcVersion)

	return {
		packageVersionSets,
		mcVersion,
		packagesReleases
	}
}

export function initializableFunc<A extends any[], R>(fn: (...args: A) => Promise<R>): (...args: A) => Promise<R> {
	let init: Promise<R> | undefined

	return async function() {
		if (init) return init
		try {
			init = fn.apply(null, arguments as never)
			return await init
		} catch(e) {
			init = undefined
			throw e
		}
	}
}

export const detectPackageManager = initializableFunc(async (): Promise<string> => {
	try {
		await cp_exec_prm('pnpm -v')
		return 'pnpm'
	} catch {}
	try {
		await cp_exec_prm('yarn -v')
		return 'yarn'
	} catch {}

	return 'npm'
})

export async function installPackages(manager?: string, packages: string[] = [], remove = false) {
	if (!manager) {
		manager ??= await detectPackageManager()
		console.log(`Using ${chalk.blueBright(manager)}`)
	}

	// why
	if (os.platform() === 'win32') manager += '.cmd'

	// run install command
	const shellProc = cp.spawn(manager, [
		manager === 'yarn' ?
			remove ? 'remove' : 'add':
			remove ? 'uninstall' : 'i',
		manager === 'yarn' ? '--cwd' : '--prefix', '.',
		'-D',
		...packages
	], {
		shell: true,
		stdio: ['pipe', 'inherit']
	})
	await events.once(shellProc, 'close')
}

export const choicesConfirm: prompts.Choice[] = [
	{ title: 'yes', value: true },
	{ title: 'no', value: false },
]

export const allModules = [
	'@minecraft/server',
	'@minecraft/server-ui',
	'@minecraft/server-gametest',
	'@minecraft/server-net',
	'@minecraft/server-admin',
	'@minecraft/debug-utilities',
]