#!/usr/bin/env node

import { program } from "commander";
const { version } = require('../package.json')

async function exec<F extends (...args: A) => any, A extends any[]>(fn: F, args: A) {
    try { await fn.apply(undefined, args) }
    catch(e) { throw e instanceof Error ? e : typeof e === 'string' ? Error(e) : e }
}

program
    .name('bedrock-scripting')
    .description('CLI Utils for Minecraft Bedrock Scripting API')
    .version(version)

program.command('init')
    .aliases(['i'])
    .description('Initializes Script Pack')
    .argument('[dir]', 'Specify directory where the script pack will be initialized')
    .action(async (dir) => {
        exec(await import('./cli/init.js').then(v => v.default.default), [dir])
    })

program.command('update')
    .aliases(['u'])
    .description('Updates Script API module dependencies')
    .argument('[dir]', 'Specify directory where the script pack will be updated')
    .action(async (dir) => {
        exec(await import('./cli/update.js').then(v => v.default.default), [dir])
    })

program.parse()