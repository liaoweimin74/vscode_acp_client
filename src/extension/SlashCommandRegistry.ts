import * as vscode from "vscode";

export interface SlashCommand {
	name: string;
	description: string;
	builtin?: boolean;
	execute: (args: string) => Promise<void> | void;
}

export class SlashCommandRegistry {
	private commands = new Map<string, SlashCommand>();

	register(command: SlashCommand): void {
		this.commands.set(command.name, command);
	}

	unregister(name: string): void {
		this.commands.delete(name);
	}

	list(): SlashCommand[] {
		return Array.from(this.commands.values());
	}

	get(name: string): SlashCommand | undefined {
		return this.commands.get(name);
	}

	async execute(name: string, args: string): Promise<{ success: boolean; error?: string; builtin?: boolean }> {
		const command = this.commands.get(name);
		if (!command) {
			return { success: false, error: vscode.l10n.t("Unknown command: /{0}", name) };
		}
		try {
			await command.execute(args);
			return { success: true, builtin: command.builtin };
		} catch (err) {
			return { success: false, error: err instanceof Error ? err.message : String(err), builtin: command.builtin };
		}
	}
}