import { PackageVersion, PackageReleaseType } from "@frostice482/bedrock-scriptapi-versions"
import chalk from "chalk"
import fsp from "fs/promises"
import prompts from "prompts"
import { packageVersionSelector } from "./util.js"

export default async function createSimple(skipPackages = false) {
	const selectedVersions = new Map<string, PackageVersion>()
	let cancel = false
	let mcv

	if (!skipPackages) {
		const { packagesReleases, mcVersion } = await packageVersionSelector([
			'@minecraft/server',
			'@minecraft/server-ui'
		])
		mcv = mcVersion

		const { pref } = await prompts({
			type: 'select',
			name: 'pref',
			message: `Select module version preference`,
			choices: [
				{
					title: chalk.greenBright('Stable'),
					value: 'stable',
					description: 'More compability',
				}, {
					title: chalk.yellowBright('Beta'),
					value: 'beta',
					description: 'More feature, unstable & can change anytime'
				},
			]
		}, {
			onCancel() { cancel = true }
		})
		if (cancel) return

		for (const [pkg, releases] of packagesReleases) {
			const stable = releases.get(PackageReleaseType.RC) ?? releases.get(PackageReleaseType.Stable)
			const beta = releases.get(PackageReleaseType.Beta)

			const version = pref === 'stable' ? stable ?? beta : beta ?? stable
			if (version) selectedVersions.set(pkg, version)
		}
	}

	// workspace setup
	console.log('Creating workspace')
	const workspaceInit = await Promise.allSettled([
		// create scripts & copy entry file
		(async() => {
			await fsp.mkdir('scripts', { recursive: true })
			await fsp.cp(new URL('../res/entry.js', import.meta.url), 'scripts/index.js')
		})()
	])
	workspaceInit.filter(v => v.status === 'rejected').forEach(console.warn)

	return {
		selectedVersions,
		mcVersion: mcv
	}
}
