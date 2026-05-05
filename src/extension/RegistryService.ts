import * as vscode from "vscode";
import type { Registry, RegistryAgent } from "../shared/types/registry.js";
import { REGISTRY_URL } from "../shared/types/registry.js";

export class RegistryService {
	private cache: Registry | null = null;
	private cacheTime = 0;
	private readonly cacheTTL = 1000 * 60 * 60; // 1 hour

	async getRegistry(forceRefresh = false): Promise<Registry> {
		const now = Date.now();

		if (!forceRefresh && this.cache && now - this.cacheTime < this.cacheTTL) {
			return this.cache;
		}

		try {
			const response = await fetch(REGISTRY_URL);
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			this.cache = (await response.json()) as Registry;
			this.cacheTime = now;
			return this.cache;
		} catch (err) {
			if (this.cache) {
				vscode.window.showWarningMessage(
					`Failed to refresh agent registry, using cached data: ${err instanceof Error ? err.message : String(err)}`,
				);
				return this.cache;
			}
			throw err;
		}
	}

	async getAgents(): Promise<RegistryAgent[]> {
		const registry = await this.getRegistry();
		return registry.agents;
	}

	getAgentCommand(agent: RegistryAgent, platform: string): { command: string; args: string[]; env?: Record<string, string> } | null {
		const dist = agent.distribution;

		if (dist.npx) {
			return {
				command: "npx",
				args: [dist.npx.package, ...(dist.npx.args || [])],
				env: dist.npx.env,
			};
		}

		if (dist.binary && dist.binary[platform]) {
			const bin = dist.binary[platform]!;
			return {
				command: bin.cmd,
				args: bin.args || [],
			};
		}

		if (dist.uvx) {
			return {
				command: "uvx",
				args: [dist.uvx.package, ...(dist.uvx.args || [])],
			};
		}

		return null;
	}

	getPlatform(): string {
		const platform = process.platform;
		const arch = process.arch;

		const platformMap: Record<string, string> = {
			darwin: arch === "arm64" ? "darwin-aarch64" : "darwin-x86_64",
			linux: arch === "arm64" ? "linux-aarch64" : "linux-x86_64",
			win32: arch === "arm64" ? "windows-aarch64" : "windows-x86_64",
		};

		return platformMap[platform] || `${platform}-${arch}`;
	}
}
