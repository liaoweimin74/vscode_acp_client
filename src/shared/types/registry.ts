export interface RegistryAgent {
	id: string;
	name: string;
	version: string;
	description: string;
	repository?: string;
	website?: string;
	authors?: string[];
	license: string;
	icon?: string;
	distribution: AgentDistribution;
}

export interface AgentDistribution {
	npx?: NpxDistribution;
	binary?: BinaryDistribution;
	uvx?: UvxDistribution;
}

export interface NpxDistribution {
	package: string;
	args?: string[];
	env?: Record<string, string>;
}

export interface BinaryDistribution {
	[platform: string]: BinaryPlatform | undefined;
}

export interface BinaryPlatform {
	archive: string;
	cmd: string;
	args?: string[];
}

export interface UvxDistribution {
	package: string;
	args?: string[];
}

export interface Registry {
	version: string;
	agents: RegistryAgent[];
	extensions: unknown[];
}

export const REGISTRY_URL = "https://cdn.agentclientprotocol.com/registry/v1/latest/registry.json";
