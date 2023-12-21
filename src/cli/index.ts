export namespace BedrockScriptingCLI {
    export const init: typeof import("./init.js").default = (...args) => { return require("./init.js").default.apply(undefined, args) }
    export const moduleSelector: typeof import("./module_selector.js").default = (...args) => { return require("./module_selector.js").default.apply(undefined, args) }
    export const update: typeof import("./update.js").default = (...args) => { return require("./update.js").default.apply(undefined, args) }
    export const versionSelector: typeof import("./version_selector.js").default = (...args) => { return require("./version_selector.js").default.apply(undefined, args) }
}

export default BedrockScriptingCLI
