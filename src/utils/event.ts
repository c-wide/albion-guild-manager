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
		const event = await import(path.join(__dirname, "../features", file));
		eventSchema.parse(event);
		yield event;
	}
}
