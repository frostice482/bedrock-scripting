#!/usr/bin/env node

import { program } from "commander";
const { version } = require('../package.json')

program
    .name('bedrock-scripting')
    .description('CLI Utils for Minecraft Bedrock Scripting API')
    .version(version)

program.command('init')
    .aliases(['i'])
    .description('Initializes Script Pack')
    .argument('[path]', 'Specify path where the script pack will be initialized')
    .action(async (path) => {
        const { default: { default: f } } = await import('./cli/init.js')
        f(path)
    })

program.command('update')
    .aliases(['u'])
    .description('Updates Script API module dependencies')
    .argument('[path]', 'Specify path where the script pack will be updated')
    .action(async (path) => {
        const { default: { default: f } } = await import('./cli/update.js')
        f(path)
    })

program.parse()