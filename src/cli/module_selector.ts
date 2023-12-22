import chalk = require('chalk')
import prompts = require("prompts")
import Table = require('easy-table')
import type * as tse from 'ts-essentials'
import cliVersionSelector, { CLIModuleVersionSelectorObject, CLIModuleVersionSelectorOptions } from "./version_selector.js"
import { fetchModuleVersionRanges } from "../lib/module_versions.js"

export default async function cliModuleSelector(opts: tse.DeepReadonly<CLIModuleSelectorOptions> = {}) {
    const {
        askUseBDS = true,
        showTable = true,
        useBDS,
        modules,
        defaultModule
    } = opts

    // common modules
    const moduleList: string[] = [
        '@minecraft/server',
        '@minecraft/server-gametest',
        '@minecraft/server-ui'
    ]

    // use bds modules
    let useBds = useBDS
    if (useBds === undefined || askUseBDS) {
        useBds = await prompts({
            type: 'toggle',
            name: 'v',
            message: 'Use BDS Modules?',
            active: 'yes',
            inactive: 'no',
            initial: useBds ?? false
        }).then(v => v.v)
    }

    // add bds modules if using bds modules
    if (useBds) moduleList.push(
        '@minecraft/server-net',
        '@minecraft/server-admin'
    )

    // version selection
    process.stdout.write('Fetching module versions from npm registry, please wait...')
    const versionSelectors = await Promise.all(
        moduleList.map(async (module): Promise<CLIModuleVersionSelectorObject> => [
            module,
            await fetchModuleVersionRanges(module),
            modules?.[module] ?? defaultModule
        ])
    )

    process.stdout.write('\x1b[2K\r')
    const versions = await cliVersionSelector(versionSelectors)

    // render table
    if (showTable) {
        const t = new Table()

        t.cell('0', 'Module'           )
        t.cell('1', 'Version'          )
        t.cell('2', 'Minecraft version')
        t.cell('3', 'Package version'  )
        t.newRow()

        for (const [mod, ver] of versions) {
            t.cell('0', chalk.cyanBright(mod))
            t.cell('1', chalk[ver.isBeta ? 'yellowBright' : 'greenBright'](ver.semver))
            t.cell('2', chalk.gray(ver.mcVersion?.text ?? '-'))
            t.cell('3', chalk.gray(ver.raw))
            t.newRow()
        }

        console.log('\n' + t.print())
    }
    
    return versions
}

export interface CLIModuleSelectorOptions {
    modules?: {
        [module: string]: CLIModuleVersionSelectorOptions
    }
    defaultModule?: CLIModuleVersionSelectorOptions
    askUseBDS?: boolean
    useBDS?: boolean
    showTable?: boolean
}
