import cp = require("child_process")
import fsp = require("fs/promises")
import util = require("util")
import { BedrockManifest } from "bedrock-pack";
import { parseModuleVersion } from "../lib/module_versions.js";
import { CLIModuleVersionSelectorOptions } from "./version_selector.js";
import cliModuleSelector from "./module_selector.js";

const exec = util.promisify(cp.exec)

const bdsModules = [
    '@minecraft/server-net',
    '@minecraft/server-admin'
]

export default async function cliUpdate(cwd?: string) {
    if (cwd) process.chdir(cwd)

    const manifestData = await fsp.readFile('manifest.json')
    const manifest = new BedrockManifest(JSON.parse(manifestData))

    const moduleOpts: Record<string, CLIModuleVersionSelectorOptions> = Object.create(null)
    let isBds = false

    for (const [name, { version }] of manifest.dependencies) {
        if (!name.startsWith('@minecraft/')) continue

        // parse version
        const versionParsed = parseModuleVersion(typeof version === 'string' ? version : version.join('.'))
        if (!versionParsed) continue

        // add module options
        moduleOpts[name] = {
            defaults: {
                use: true,
                beta: versionParsed.isBeta,
                moduleVersion: versionParsed.version
            }
        }

        // set bds mode
        if (!isBds && bdsModules.includes(name)) isBds = true

        // delete dependency
        manifest.dependencies.delete(name)
    }

    const modules = await cliModuleSelector({
        useBDS: isBds,
        askUseBDS: true,
        modules: moduleOpts,
        defaultModule: {
            defaults: {
                use: false
            }
        },
        showTable: true
    })

    const uninstalls = Object.keys(moduleOpts).filter(module => !modules.has(module))

    // install
    console.log('Installing modules, please wait...')
    await exec('npm i -D ' + Array.from(modules, ([mod, ver]) => mod + '@' + ver.raw).join(' '))

    // uninstall
    if (uninstalls.length) {
        console.log('Uninstalling modules, please wait...')
        await exec('npm uninstall ' + uninstalls.join(' '))
    }

    // manifest
    for (const [mod, ver] of modules) manifest.dependencies.addModule(mod, ver.semver)
    fsp.writeFile('manifest.json', JSON.stringify(manifest, null, 4))

    console.log('Finished')
}
