import type {
	AutocompleteInteraction,
	ChatInputCommandInteraction,
} from "discord.js";
import { commands } from "~/utils/command";
import { getLastUsage, isOnCooldown, setCooldown } from "~/utils/cooldown";
import type { EventHandler, EventName } from "~/utils/event";
import { logger } from "~/utils/logger";
import { getErrorMessage } from "~/utils/misc";

// TODO: i18n
// TODO: i.commandName localization?

export const name: EventName = "interactionCreate";

export const once = false;

export const handler: EventHandler<typeof name> = (i) => {
	if (i.isChatInputCommand()) {
		chatInputCommandHandler(i);
	} else if (i.isAutocomplete()) {
		autocompleteHandler(i);
	}
};

function chatInputCommandHandler(i: ChatInputCommandInteraction): void {
	const command = commands.get(i.commandName);

	if (!command) {
		logger.warn({ name: i.commandName, user: i.user.id }, "Invalid command");
		i.reply({
			content: "This command does not exist",
			ephemeral: true,
		});
		return;
	}

	if (isOnCooldown(i.commandName, i.user.id)) {
		const lastUsage = getLastUsage(i.commandName, i.user.id);
		if (!lastUsage) return;

		const expiresAt = lastUsage + (command.cooldown ?? 0) * 1000;
		const discordTimestamp = Math.round(expiresAt / 1000);

		i.reply({
			content: `Please wait, you are on a cooldown for the "${i.commandName}" command. You can use it again <t:${discordTimestamp}:R>.`,
			ephemeral: true,
		});

		return;
	}

	setCooldown(i.commandName, i.user.id);

	try {
		logger.info({ name: i.commandName, user: i.user.id }, "Executing command");
		command.handler(i);
	} catch (e) {
		logger.error(
			e,
			`Error while handling the "${i.commandName}" command - ${getErrorMessage(
				e,
			)}`,
		);

		if (i.replied || i.deferred) {
			i.followUp({
				content: "An error occurred while handling the command",
				ephemeral: true,
			});
		} else {
			i.reply({
				content: "An error occurred while handling the command",
				ephemeral: true,
			});
		}
	}
}

function autocompleteHandler(i: AutocompleteInteraction): void {
	const command = commands.get(i.commandName);

	if (!command) {
		logger.warn({ name: i.commandName, user: i.user.id }, "Invalid command");
		i.respond([]);
		return;
	}

	// TODO: Implement autocomplete
}
