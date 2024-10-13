import { readdir } from "node:fs/promises";
import path from "node:path";
import type { Client, ClientEvents } from "discord.js";
import { z } from "zod";

export type EventName = keyof ClientEvents;

export type EventHandler<T extends EventName> = (
	...args: ClientEvents[T]
) => void | Promise<void>;

export const eventSchema = z.object({
	handler: z.function(),
	name: z.string(),
	once: z.boolean(),
});

export async function registerEvents(client: Client) {
	for await (const file of eventFiles()) {
		client[file.once ? "once" : "on"](file.name, file.handler);
	}
}

export async function* eventFiles() {
	const files = await readdir(path.join(import.meta.dirname, "../features"), {
		recursive: true,
	});

	const eventFiles = files.filter((file) => file.endsWith(".event.ts"));

	for (const file of eventFiles) {
		const fileData = await import(
			path.join(import.meta.dirname, "../features", file)
		);

		const parsed = eventSchema.safeParse(fileData);
		if (!parsed.success) {
			console.error(`❌ Invalid event file [${file}]`);
			console.error(parsed.error.issues);
			process.exit(1);
		}

		yield fileData;
	}
}
