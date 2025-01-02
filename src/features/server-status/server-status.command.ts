import assert from "node:assert";
import {
	InteractionContextType,
	MessageFlags,
	SlashCommandBuilder,
} from "discord.js";
import {
	disableNotifications,
	enableNotifications,
} from "#src/features/server-status/toggle.ts";
import { setupWizard } from "#src/features/server-status/wizard.ts";
import type { CommandHandler } from "#src/utils/command.ts";
import { config } from "#src/utils/config.ts";
import i18n from "#src/utils/i18n.ts";
import { logger } from "#src/utils/logger.ts";
import {
	createGenericEmbed,
	guildCache,
	isAdminOrManager,
} from "#src/utils/misc.ts";

export const cooldown = 5;

export const builder = new SlashCommandBuilder()
	.setName(i18n.t("serverStatus.name", { ns: "commands", lng: "en" }))
	.setDescription(i18n.t("serverStatus.desc", { ns: "commands", lng: "en" }))
	.addSubcommand((subcommand) =>
		subcommand
			.setName(
				i18n.t("serverStatus.subcommands.enable.name", {
					ns: "commands",
					lng: "en",
				}),
			)
			.setDescription(
				i18n.t("serverStatus.subcommands.enable.desc", {
					ns: "commands",
					lng: "en",
				}),
			),
	)
	.addSubcommand((subcommand) =>
		subcommand
			.setName(
				i18n.t("serverStatus.subcommands.disable.name", {
					ns: "commands",
					lng: "en",
				}),
			)
			.setDescription(
				i18n.t("serverStatus.subcommands.disable.desc", {
					ns: "commands",
					lng: "en",
				}),
			),
	)
	.addSubcommand((subcommand) =>
		subcommand
			.setName(
				i18n.t("serverStatus.subcommands.setup.name", {
					ns: "commands",
					lng: "en",
				}),
			)
			.setDescription(
				i18n.t("serverStatus.subcommands.setup.desc", {
					ns: "commands",
					lng: "en",
				}),
			),
	)
	.setContexts(InteractionContextType.Guild);

// TODO: if target channel is deleted, changed to non-text based, etc..., disable command and notify user
export const handler: CommandHandler = async ({ cid, i }) => {
	// Retreive cached guild
	const cachedGuild = guildCache.get(i.guildId ?? "");
	assert(cachedGuild, "Guild not found in cache");

	// Only server admins or managers can use these commands
	if (!isAdminOrManager(i.member, cachedGuild)) {
		logger.info({ cid }, "User lacks permission");
		await i.reply({
			content: "",
			embeds: [
				createGenericEmbed({
					title: " ",
					description: i18n.t("serverStatus.responses.noPermission", {
						ns: "commands",
						lng: i.locale,
					}),
					color: config.colors.warning,
				}),
			],
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	// Extract subcommand options
	const subcommand = i.options.getSubcommand();

	// Handle setup wizard
	if (subcommand === "setup") {
		await setupWizard(cid, i, cachedGuild);
		return;
	}

	// Initial deferral to prevent timeouts
	await i.deferReply({ flags: MessageFlags.Ephemeral });

	// Handle one of the other subcommands
	switch (subcommand) {
		case "enable":
			await enableNotifications(cid, i, cachedGuild);
			break;
		case "disable":
			await disableNotifications(cid, i, cachedGuild);
			break;
	}
};
