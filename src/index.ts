#!/usr/bin/env node

import { program } from 'commander'
import fsp from 'fs/promises'

async function exec(cwd: string | undefined, target: string, args: any[]) {
	if (cwd) {
		await fsp.mkdir(cwd, { recursive: true })
		process.chdir(cwd)
	}

	try {
		const status = await import(target).then(v => v.default(...args))
		switch (status) {
			case true:
				return 0
			case undefined:
				console.warn('Canceled')
				return 2
			default:
				throw status
		}
	} catch(e) {
		console.error('Error!', e)
		return 1
	}
}

function createExecuter(target: string) {
	return async (cwd: string | undefined, ...args: any[]) => {
		process.exitCode = await exec(cwd, target, args)
	}
}

program.name('bedrock-scripting')
	.description('Create new / update existing Bedrock Scripting addon')
	.version('0.0.1')

program.command('create')
	.alias('c')
	.description('Creates new Bedrock Scripting addon')
	.argument('[dir]', 'Working directoru')
	.option('--force')
	.option('--skip-packages', 'Skip package options')
	.action(createExecuter('./create.js'))

program.command('update')
	.alias('u')
	.description('Updates existing Bedrock Scripting addon')
	.argument('[dir]', 'Working directory')
	.action(createExecuter('./update.js'))

program.parse()
