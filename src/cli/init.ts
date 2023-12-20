import cp = require("child_process")
import crypto = require("crypto")
import fsp = require("fs/promises")
import path = require("path")
import prompts = require("prompts")
import semver = require("semver")
import util = require("util")
import { BedrockManifest } from 'bedrock-pack'
import cliModuleSelector from "./module_selector.js";

const exec = util.promisify(cp.exec)
const resRoot = path.join(__dirname, '..', '..', 'res')

export default async function cliInit(cwd?: string) {
    if (cwd) process.chdir(cwd)

    const tsPrefs = await exec('tsc -v').then(() => true, () => false)
    const manifest = new BedrockManifest

    // pack info
    const { pack_name, pack_desc, pack_ver, pack_minver, pack_entry } = await prompts([
        {
            type: 'text',
            name: 'pack_name',
            message: 'Pack name',
            initial: 'Script API Pack',
        }, {
            type: 'text',
            name: 'pack_desc',
            message: 'Pack description',
        }, {
            type: 'text',
            name: 'pack_ver',
            message: 'Pack version',
            initial: '1.0.0',
            validate: value => semver.valid(value) ? true : 'Bad version format',
            format: value => semver.valid(value)
        }, {
            type: 'text',
            name: 'pack_minver',
            message: 'Minimum engine version',
            initial: '1.20.0',
            validate: value => semverSimple.test(value) ? true : 'Bad version format',
            format: value => value.split('.').map(Number)
        }, {
            type: 'text',
            name: 'pack_entry',
            message: 'Script entry file',
            initial: 'scripts/index.js',
            validate: value => {
                value = path.posix.normalize(value.trim())
                return !value.startsWith('scripts/') ? 'Script files must be in scripts/ folder'
                    : !value.endsWith('.js') ? 'Script files extension must be .js'
                    : true
            },
            format: value => path.posix.normalize(value.trim())
        }
    ])

    // typescript info
    const { use_ts, install_ts, ts_folder } = await prompts([
        {
            type: 'toggle',
            name: 'use_ts',
            message: 'Use TypeScript?',
            active: 'yes',
            inactive: 'no',
            initial: tsPrefs
        }, {
            type: (prev, v) => v.use_ts && 'toggle',
            name: 'install_ts',
            message: 'Install TypeScript?',
            active: 'yes',
            inactive: 'no',
            initial: !tsPrefs
        }, {
            type: (prev, v) => v.use_ts && 'text',
            name: 'ts_folder',
            message: 'TypeScript source folder',
            initial: 'src'
        }
    ])

    // assign to manifest
    manifest.name = pack_name
    manifest.description = pack_desc
    manifest.version = pack_ver
    manifest.minEngineVersion = pack_minver
    manifest.modules.add({
        type: 'script',
        entry: pack_entry,
        uuid: crypto.randomUUID(),
        version: pack_ver
    })

    // modules
    const modules = await cliModuleSelector({
        showTable: true
    })

    // modules to be installed
    const moduleInstalls = Array.from(modules, ([mod, ver]) => mod + '@' + ver.raw)
    if (use_ts && install_ts) moduleInstalls.push('typescript')

    // install
    console.log('Installing modules, please wait...')
    await exec('npm i -D ' + moduleInstalls.join(' '))

    // init workspace
    console.log('Initializing script pack, please wait...')

    // manifest
    for (const [mod, ver] of modules) manifest.dependencies.addModule(mod, ver.semver)
    fsp.writeFile('manifest.json', JSON.stringify(manifest, null, 4))

    // jsconfig / tsconfig & source path
    const [sourceEntryFile, sourceConfigFile] = use_ts ? ['entry.ts', 'tsconfig.json'] : ['entry.js', 'jsconfig.json']
    const srcRootConfig = use_ts ? ts_folder : 'scripts'

    // modify jsconfig / tsconfig
    const sourceConfigData = require('../../res/' + sourceConfigFile)
    sourceConfigData.compilerOptions.rootDir = srcRootConfig
    sourceConfigData.compilerOptions.baseUrl = srcRootConfig
    sourceConfigData.include = [srcRootConfig]

    // write jsconfig / tsconfig
    await fsp.writeFile(sourceConfigFile, JSON.stringify(sourceConfigData, null, 4))

    // entry source
    let {dir: entryDir, name: entryName} = path.parse(pack_entry)
    if (use_ts) entryDir = ts_folder + '/' + entryDir.substring('scripts/'.length)
    await fsp.mkdir(entryDir, { recursive: true })

    // copy entry & type file
    await fsp.copyFile( path.join(resRoot, sourceEntryFile), path.join(entryDir, entryName + (use_ts ? '.ts' : '.js')) )
    await fsp.copyFile( path.join(resRoot, 'types.d.ts'), path.join(entryDir, 'types.d.ts') )

    console.log('Finished')
}

const semverSimple = /^\d+\.\d+\.\d+$/
