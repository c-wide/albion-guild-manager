import { until } from "@open-draft/until";
import {
	type AutocompleteInteraction,
	type ChatInputCommandInteraction,
	MessageFlags,
} from "discord.js";
import { v7 } from "uuid";
import { commands } from "#src/utils/command.ts";
import {
	getLastUsage,
	isOnCooldown,
	setCooldown,
} from "#src/utils/cooldown.ts";
import type { EventHandler, EventName } from "#src/utils/event.ts";
import i18n from "#src/utils/i18n.ts";
import { logger } from "#src/utils/logger.ts";
import {
	createErrorEmbed,
	createGenericEmbed,
	getErrorMessage,
	getServerId,
} from "#src/utils/misc.ts";

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
				serverId: getServerId(i.guildId),
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
				serverId: getServerId(i.guildId),
			},
			"Invalid command",
		);
		await i.reply({
			content: "",
			embeds: [
				createErrorEmbed(
					"N/A",
					i18n.t("command.error.unknown", { ns: "system", lng: i.locale }),
					i.locale,
				),
			],
			flags: MessageFlags.Ephemeral,
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
			embeds: [
				createGenericEmbed({
					title: i18n.t("command.cooldown.title", {
						ns: "system",
						lng: i.locale,
					}),
					description: i18n.t("command.cooldown.desc", {
						commandName: i.commandName,
						discordTimestamp,
						ns: "system",
						lng: i.locale,
					}),
				}),
			],
			flags: MessageFlags.Ephemeral,
		});

		return;
	}

	setCooldown(i.commandName, i.user.id);

	const cid = v7();
	try {
		logger.info(
			{
				commandName: i.commandName,
				userId: i.user.id,
				serverId: getServerId(i.guildId),
				cid,
			},
			"Command executed",
		);

		if (!i.inCachedGuild()) throw new Error("Guild not found in djs cache");

		await command.handler({ cid, i });
	} catch (e) {
		logger.error(
			{
				error: getErrorMessage(e),
				commandName: i.commandName,
				userId: i.user.id,
				serverId: getServerId(i.guildId),
				cid,
			},
			"Error while handling command",
		);

		const errorMessage = i18n.t("command.error.generic", {
			ns: "system",
			lng: i.locale,
		});

		if (i.replied || i.deferred) {
			await i.followUp({
				content: "",
				embeds: [createErrorEmbed(cid, errorMessage, i.locale)],
				flags: MessageFlags.Ephemeral,
			});
		} else {
			await i.reply({
				content: "",
				embeds: [createErrorEmbed(cid, errorMessage, i.locale)],
				flags: MessageFlags.Ephemeral,
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
				serverId: getServerId(i.guildId),
			},
			"Invalid command",
		);
		await i.respond([]);
		return;
	}

	// TODO: Implement autocomplete
}
