import { Collection } from "discord.js";
import { commands } from "~/utils/command";

const cooldowns = new Collection<string, number>();

function getCooldownKey(commandName: string, userId: string): string {
	return `${commandName}:${userId}`;
}

export function isOnCooldown(commandName: string, userId: string): boolean {
	const command = commands.get(commandName);
	if (!command || !command.cooldown) return false;

	const key = getCooldownKey(commandName, userId);

	const now = Date.now();
	const lastUsage = cooldowns.get(key);

	if (!lastUsage) return false;

	return now < lastUsage + command.cooldown * 1000;
}

export function setCooldown(commandName: string, userId: string): void {
	const command = commands.get(commandName);
	if (!command || !command.cooldown) return;

	const key = getCooldownKey(commandName, userId);
	cooldowns.set(key, Date.now());
}

export function getLastUsage(
	commandName: string,
	userId: string,
): number | undefined {
	return cooldowns.get(getCooldownKey(commandName, userId));
}

setInterval(() => {
	const now = Date.now();

	for (const [key, lastUsage] of cooldowns.entries()) {
		const command = commands.get(key.split(":")[0]);
		if (!command || !command.cooldown) continue;

		const expirationTime = lastUsage + command.cooldown * 1000;
		if (now > expirationTime) {
			cooldowns.delete(key);
		}
	}
}, 1000);
