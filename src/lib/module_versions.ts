import semver = require('semver')

/**
 * Gets package versions from npm registry
 * @param name package name
 * @returns Array of versions
 */
export async function fetchPackageVersions(name: string) {
    const ab = new AbortController()
    const res = await fetch('https://registry.npmjs.org/' + name, {
        headers: {
            Accept: 'application/vnd.npm.install-v1+json'
        },
        signal: ab.signal
    })

    if (!res.ok && !res.redirected) {
        ab.abort()
        return []
    }

    const data = await res.json() as any
    return Object.keys(data.versions)
}

/** Pattern for Script API module version */
export const moduleVersionPattern = /^(?<modSemver>(?<modVer>\d+\.\d+\.\d+)(-(?<modType>beta|rc))?)(\.(?<mcSemver>(?<mcVer>\d+\.\d+\.\d+)\-(?<mcVerType>stable|preview\.(?<mcPrevRev>\d+))))?$/

/**
 * Parses Script API module version into object
 * @param version Module version
 * @returns object, undefined if module version cannot be parsed
 */
export function parseModuleVersion(version: string): ScriptModuleVersion | undefined {
    const match = version.match(moduleVersionPattern)
    if (!match) return undefined

    let {
        modSemver = '', modVer = '', modType,
        mcSemver, mcVer, mcVerType, mcPrevRev
    } = match.groups ?? {}

    if (mcVer && mcPrevRev) mcVer += '.' + mcPrevRev
    const isPreview = mcVerType?.startsWith('preview') ?? false

    return {
        version: modVer,
        semver: modSemver,
        isBeta: modType === 'beta',
        isReleaseCandidate: modType === 'rc',
        mcVersion: mcVer ? {
            version: mcVer,
            semver: mcSemver ?? '',
            isPreview: isPreview,
            text: mcVer + (isPreview ? ' Preview' : ''),
        } : undefined,
        raw: version,
    }
}


export interface ScriptModuleVersion {
    readonly version: string
    readonly semver: string
    readonly isBeta: boolean
    readonly isReleaseCandidate: boolean
    readonly mcVersion?: MCVersion
    readonly raw: string
}

/**
 * Fetch Script API module versions and its Minecraft version range
 * @param module Script API module
 * @returns Version ranges
 */
export async function fetchModuleVersionRanges(module: string): Promise<ScriptModuleVersionRange> {
    const stableRange = new Map<string, ScriptModuleVersionRange.Stable>()
    const betaRange = new Map<string, ScriptModuleVersionRange.Beta>()

    const vers = await fetchPackageVersions(module).then(semver.sort)
    for (const rawVer of vers) {
        const data = parseModuleVersion(rawVer)
        if (!data) continue

        const { version, isBeta, isReleaseCandidate } = data

        if (isBeta && data.mcVersion) {
            const { mcVersion } = data

            const range = betaRange.get(version)
            if (!range) {
                betaRange.set(version, {
                    min: mcVersion,
                    max: mcVersion,
                    mcVersions: new Map([[mcVersion.semver, data]])
                })
            } else {
                range.max = mcVersion
                range.mcVersions.set(mcVersion.semver, data)
            }
        } else {
            const range = stableRange.get(version)
            if (!range) {
                const { mcVersion } = data
                if (!mcVersion) throw null

                stableRange.set(version, {
                    min: mcVersion,
                    latest: mcVersion,
                    mcVersions: new Map([[mcVersion.semver, data]])
                })
            } else if (isReleaseCandidate && data.mcVersion) {
                const { mcVersion } = data

                range.latest = data.mcVersion
                range.mcVersions.set(mcVersion.semver, data)
            } else {
                range.stable = data
            }
        }
    }

    return {
        stable: stableRange,
        beta: betaRange
    }
}

export declare namespace ScriptModuleVersionRange {
    interface Base {
        /** Map pairs of Minecraft version and its script module version related */
        mcVersions: Map<string, ScriptModuleVersion>
    }

    interface Stable extends Base {
        min: MCVersion
        latest: MCVersion
        stable?: ScriptModuleVersion
    }

    interface Beta extends Base {
        min: MCVersion
        max: MCVersion
    }

    interface T {
        /** Map pairs of stable module versions and its Minecraft version list */
        stable: Map<string, Stable>
        /** Map pairs of beta module versions and its Minecraft version list */
        beta: Map<string, Beta>
    }
}
export type ScriptModuleVersionRange = ScriptModuleVersionRange.T

export interface MCVersion {
    readonly version: string
    readonly semver: string
    readonly isPreview: boolean
    readonly text: string
}
