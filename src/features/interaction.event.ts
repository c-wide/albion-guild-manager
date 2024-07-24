import type {
	AutocompleteInteraction,
	ChatInputCommandInteraction,
} from "discord.js";
import { commands } from "~/utils/command";
import { getLastUsage, isOnCooldown, setCooldown } from "~/utils/cooldown";
import type { EventHandler, EventName } from "~/utils/event";
import i18n from "~/utils/i18n";
import { logger } from "~/utils/logger";
import { getErrorMessage } from "~/utils/misc";

// TODO: handle DM commands
// TODO: log if used in guild?

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
			content: i18n.t("commandUnknown", { lng: i.locale }),
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
			content: i18n.t("commandCooldown", {
				commandName: i.commandName,
				discordTimestamp,
				lng: i.locale,
			}),
			ephemeral: true,
		});

		return;
	}

	setCooldown(i.commandName, i.user.id);

	try {
		logger.info({ name: i.commandName, user: i.user.id }, "Command executed");
		command.handler(i);
	} catch (e) {
		logger.error(
			e,
			`Error while handling the "${i.commandName}" command - ${getErrorMessage(
				e,
			)}`,
		);

		const errorMessage = i18n.t("commandGenericError", {
			lng: i.locale,
		});

		if (i.replied || i.deferred) {
			i.followUp({
				content: errorMessage,
				ephemeral: true,
			});
		} else {
			i.reply({
				content: errorMessage,
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