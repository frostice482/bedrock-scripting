export declare namespace Manifest {
	interface Header {
		name: string
		description: string
		uuid: string
		version: string | number[]
		min_engine_version: number[]
	}
	interface Module {
		type: string
		description?: string
		uuid: string
		version: string | number[]
		[k: string]: any
	}
	interface Dependency {
		uuid?: string
		module_name?: string
		version: string | number[]
	}
	interface Manifest {
		format_version: number
		header: Header
		modules: Module[]
		dependencies: Dependency[]
		capabilities: string[]
	}
}
export type Manifest = Manifest.Manifest