import type {
	AutocompleteInteraction,
	ChatInputCommandInteraction,
} from "discord.js";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

export type CommandHandler = (
	i: ChatInputCommandInteraction,
) => void | Promise<void>;

export type AutocompleteHandler = (
	i: AutocompleteInteraction,
) => void | Promise<void>;

export const commandSchema = z.object({
	handler: z.function(),
	builder: z.object({
		name: z.string(),
		description: z.string(),
	}),
	autocomplete: z.function().optional(),
	cooldown: z.number().optional(),
});

export async function* commandFiles() {
	const files = await readdir(path.join(__dirname, "../features"), {
		recursive: true,
	});

	const commandFiles = files.filter((file) => file.endsWith(".command.ts"));

	for (const file of commandFiles) {
		const fileData = await import(path.join(__dirname, "../features", file));

		const parsed = commandSchema.safeParse(fileData);
		if (!parsed.success) {
			console.error(`❌ Invalid command file [${file}]`);
			console.error(parsed.error.issues);
			throw new Error("Invalid command file");
		}

		yield fileData;
	}
}
