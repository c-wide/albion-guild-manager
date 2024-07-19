import type { ClientEvents } from "discord.js";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

export type EventHandler<T extends keyof ClientEvents> = (
	...args: ClientEvents[T]
) => void | Promise<void>;

export const eventSchema = z.object({
	handler: z.function(),
	name: z.string(),
	once: z.boolean().optional(),
});

export async function* eventFiles() {
	const files = await readdir(path.join(__dirname, "../features"), {
		recursive: true,
	});

	const eventFiles = files.filter((file) => file.endsWith(".event.ts"));

	for (const file of eventFiles) {
		const fileData = await import(path.join(__dirname, "../features", file));

		const parsed = eventSchema.safeParse(fileData);
		if (!parsed.success) {
			console.error(`❌ Invalid event file [${file}]`);
			console.error(parsed.error.issues);
			throw new Error("Invalid event file");
		}

		yield fileData;
	}
}
