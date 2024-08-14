import { until } from "@open-draft/until";
import type {
	AutocompleteInteraction,
	ChatInputCommandInteraction,
} from "discord.js";
import { commands } from "~/utils/command";
import { getLastUsage, isOnCooldown, setCooldown } from "~/utils/cooldown";
import type { EventHandler, EventName } from "~/utils/event";
import i18n from "~/utils/i18n";
import { logger } from "~/utils/logger";
import { createErrorEmbed, createGenericEmbed, getGuildId } from "~/utils/misc";

export const name: EventName = "interactionCreate";
export const once = false;

export const handler: EventHandler<typeof name> = async (i) => {
	const { error } = await until(async () => {
		if (i.isChatInputCommand()) {
			await chatInputCommandHandler(i);
			return;
		}

		if (i.isAutocomplete()) {
			await autocompleteHandler(i);
			return;
		}
	});

	if (error) {
		logger.error(
			{
				commandName: i.isCommand() && i.commandName,
				userId: i.user.id,
				serverId: i.guildId && getGuildId(i.guildId),
			},
			"Uncaught command interaction error",
		);
	}
};

async function chatInputCommandHandler(
	i: ChatInputCommandInteraction,
): Promise<void> {
	const command = commands.get(i.commandName);

	if (!command) {
		logger.warn(
			{
				commandName: i.commandName,
				userId: i.user.id,
				serverId: i.guildId && getGuildId(i.guildId),
			},
			"Invalid command",
		);
		await i.reply({
			content: "",
			ephemeral: true,
			embeds: [
				createErrorEmbed(
					i18n.t("cmd-err-unknown", { lng: i.locale }),
					i.locale,
				),
			],
		});
		return;
	}

	if (isOnCooldown(i.commandName, i.user.id)) {
		const lastUsage = getLastUsage(i.commandName, i.user.id);
		if (!lastUsage) return;

		const expiresAt = lastUsage + (command.cooldown ?? 0) * 1_000;
		const discordTimestamp = Math.round(expiresAt / 1_000);

		await i.reply({
			content: "",
			ephemeral: true,
			embeds: [
				createGenericEmbed({
					title: i18n.t("cmd-res-cooldown-title", {
						lng: i.locale,
					}),
					description: i18n.t("cmd-res-cooldown-desc", {
						commandName: i.commandName,
						discordTimestamp,
						lng: i.locale,
					}),
				}),
			],
		});

		return;
	}

	setCooldown(i.commandName, i.user.id);

	try {
		logger.info(
			{
				commandName: i.commandName,
				userId: i.user.id,
				serverId: i.guildId && getGuildId(i.guildId),
			},
			"Command executed",
		);

		await command.handler(i);
	} catch (e) {
		logger.error(
			{
				error: e,
				commandName: i.commandName,
				userId: i.user.id,
				serverId: i.guildId && getGuildId(i.guildId),
			},
			"Error while handling command",
		);

		const errorMessage = i18n.t("cmd-err-generic", {
			lng: i.locale,
		});

		if (i.replied || i.deferred) {
			await i.followUp({
				content: "",
				ephemeral: true,
				embeds: [createErrorEmbed(errorMessage, i.locale)],
			});
		} else {
			await i.reply({
				content: "",
				ephemeral: true,
				embeds: [createErrorEmbed(errorMessage, i.locale)],
			});
		}
	}
}

async function autocompleteHandler(i: AutocompleteInteraction): Promise<void> {
	const command = commands.get(i.commandName);

	if (!command) {
		logger.warn(
			{
				commandName: i.commandName,
				userId: i.user.id,
				serverId: i.guildId && getGuildId(i.guildId),
			},
			"Invalid command",
		);
		await i.respond([]);
		return;
	}

	// TODO: Implement autocomplete
}
