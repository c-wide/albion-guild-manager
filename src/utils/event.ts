import type { ClientEvents } from "discord.js";
import { readdir } from "node:fs/promises";
import path from "node:path";

export type EventHandler<T extends keyof ClientEvents> = (
	...args: ClientEvents[T]
) => void | Promise<void>;

export async function* eventFiles() {
	const files = await readdir(path.join(__dirname, "../features"), {
		recursive: true,
	});

	const commandFiles = files.filter((file) => file.endsWith(".event.ts"));

	for (const file of commandFiles) {
		yield await import(path.join(__dirname, "../features", file));
	}
}
