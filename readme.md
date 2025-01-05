__bedrock-scripting__: CLI tool to create / update Bedrock Scripting addon.

## Installation

Use NPM package manager (npm, pnpm, or yarn)

```sh
npm i @frostice482/bedrock-scripting
pnpm i @frostice482/bedrock-scripting
yarn add @frostice482/bedrock-scripting
```

## Running

- `bedrock-scripting c [dir]`: Creates new Bedrock Scripting addon.

	This command generates `manifest.json` and installs which package to use.
	You will need to specify basic addon info, such as name, description, and version.
	You can specify which setup mode to use:

	- **Simple**: You will need to select Minecraft version to use and version preferences (stable or beta) and let the program do the rest.
	The default modules that will be installed are `@minecraft/server` and `@minecraft/server-ui`.

	- **Advanced**: You will need to select Select Minecraft version and version preferences _individually_, specify source folder and entry file, and whether to use & install Typescript and Esbuild. This may additionally generate [build script](./res/build.mjs) (for esbuild) and [tsconfig](./res/tsconfig.json) (for typescript).

	Options:

	- `--skip-packages` skips loading & installing `@minecraft` modules

- `bedrock-scripting u [dir]`: Updates Bedrock Scripting addno.

	You will need to specify next addon version and which Minecraft version to update to.
	After that, the program will take module dependencies from `manifest.json`
	and determines module preferences to new version (unused, stable, or beta) automatically.
	You can also choose to adjust each module preferences.

	After that, the program will update `manifest.json`'s version, min_engine_version, and dependencies to reflect newer version.
	It will also install / uninstall `@minecraft` modules depending on preferences.

## Building

Run `build.js`.