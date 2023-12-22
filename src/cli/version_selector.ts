import chalk = require('chalk')
import prompts = require('prompts')
import semver = require('semver')
import type * as tse from 'ts-essentials'
import { ScriptModuleVersion, ScriptModuleVersionRange } from '../lib/module_versions.js';
import { findIndexZero } from '../lib/utils.js';

export default async function cliVersionSelector(list: Iterable<CLIModuleVersionSelectorObject>, defaultOpts?: CLIModuleVersionSelectorOptionsReadonly | null) {
    const modulesVersions = new Map<string, ScriptModuleVersion>()

    let preferredMinecraftVersion: string | undefined

    for (const [module, verRanges, opts = defaultOpts] of list) {
        const { defaults = {}, text } = opts ?? {}

        // get module version type to be used:
        // unused, stable, or beta
        const use = await prompts({
            type: 'select',
            name: 'use',
            message: `Select module ${chalk.cyanBright(module)} version type`,
            hint: text,
            choices: [
                {
                    title: chalk.gray('unused'),
                    description: 'Do not use this module',
                    value: 'unused'
                }, {
                    title: chalk.blueBright('stable'),
                    description: 'Less features, but works across breaking changes',
                    value: 'stable',
                    disabled: verRanges.stable.size === 0
                }, {
                    title: chalk.yellowBright('beta'),
                    description: 'More features, but unstable and version-specific',
                    value: 'beta',
                    disabled: verRanges.beta.size === 0
                }
            ],
            initial: opts
                ? defaults.use
                    ? defaults.beta || verRanges.stable.size === 0
                        ? 2
                        : 1
                    : 0
                : verRanges.stable.size === 0
                    ? 2
                    : 1,
            warn: 'No available versions',
        }).then(v => v.use as 'unused' | 'stable' | 'beta')

        // if unused, continue
        if (use === 'unused') continue

        const modVerListChoices = (
            use === 'stable'
            // stable modules
            ? Array.from(
                verRanges.stable,
                ([ver, range]) => ({
                    title: ver,
                    description: 'Minimum: ' + range.min.text
                        + '\n' + 'Recommended: >' + range.latest.text
                        + '\n' + ( !range.stable ? chalk.yellow('release candidate') : 'released' ),
                    value: range,
                })
            )
            // beta modules
            : Array.from(
                verRanges.beta,
                ([ver, range]) => ({
                    title: ver,
                    description: range.min.text + ' - ' + range.max.text,
                    value: range,
                })
            )
        ).reverse()

        // get module version
        const modVerList = await prompts({
            type: 'select',
            name: 'mver',
            message: 'Select module version to use',
            choices: modVerListChoices,
            initial: findIndexZero(
                modVerListChoices,
                ({value: range, title: ver}) => preferredMinecraftVersion
                    ? semver.satisfies(preferredMinecraftVersion, '>=' + range.min.semver + ' <=' + ('max' in range ? range.max : range.latest).semver)
                    : defaults?.moduleVersion === ver
            )
        }).then(v => v.mver as ScriptModuleVersionRange.Stable)

        const modVerChoices = (
            use === 'stable'
            // stable module minecraft versions
            ? Array.from(
                modVerList.mcVersions,
                ([mcver, moduleVer]) => ({
                    title: moduleVer.mcVersion?.text ?? mcver,
                    description: `rc (${moduleVer.raw})`,
                    value: moduleVer,
                })
            )
            .concat(modVerList.stable ? {
                title: 'release',
                description: '>' + modVerList.latest.text,
                value: modVerList.stable,
            } : [])

            // beta module minecraft versions
            : Array.from(
                modVerList.mcVersions,
                ([mcver, moduleVer]) => ({
                    title: moduleVer.mcVersion?.text ?? mcver,
                    description: moduleVer.raw,
                    value: moduleVer,
                })
            )
        ).reverse()

        // get mc version
        const modVer = await prompts({
            type: 'select',
            name: 'mcver',
            message: 'Select Minecraft version to use',
            choices: modVerChoices,
            initial: findIndexZero(
                modVerChoices,
                ({ value: { mcVersion } }) => mcVersion && (
                    preferredMinecraftVersion === mcVersion.semver
                    || defaults?.mcVersion === mcVersion.toString()
                )
            )
        }).then(v => v.mcver as ScriptModuleVersion)

        if (modVer.mcVersion && !preferredMinecraftVersion) preferredMinecraftVersion = modVer.mcVersion.semver
        modulesVersions.set(module, modVer)
    }

    return modulesVersions
}

export type CLIModuleVersionSelectorObject = readonly [
    module: string,
    versionRanges: ScriptModuleVersionRange,
    opts?: CLIModuleVersionSelectorOptionsReadonly
]

export interface CLIModuleVersionSelectorOptions {
    defaults?: {
        use?: boolean
        beta?: boolean
        moduleVersion?: string
        mcVersion?: string
    }
    text?: string
}

type CLIModuleVersionSelectorOptionsReadonly = tse.DeepReadonly<CLIModuleVersionSelectorOptions>
