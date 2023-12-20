import cliInit from "./init.js";
import cliModuleSelector from "./module_selector.js";
import cliUpdate from "./update.js";
import cliVersionSelector from "./version_selector.js";

export namespace BedrockScriptingCLI {
    export const init = cliInit
    export const moduleSelector = cliModuleSelector
    export const update = cliUpdate
    export const versionSelector = cliVersionSelector
}