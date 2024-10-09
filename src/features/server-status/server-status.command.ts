import assert from "node:assert";
import {
	InteractionContextType,
	SlashCommandBuilder,
	type SlashCommandStringOption,
} from "discord.js";
import { setChannel } from "#src/features/server-status/channel.ts";
import {
	addRegion,
	removeRegion,
	viewRegions,
} from "#src/features/server-status/region.ts";
import {
	disableNotifications,
	enableNotifications,
} from "#src/features/server-status/toggle.ts";
import type { CommandHandler } from "#src/utils/command.ts";
import { config } from "#src/utils/config.ts";
import i18n from "#src/utils/i18n.ts";
import { logger } from "#src/utils/logger.ts";
import {
	type OptionFunc,
	createGenericEmbed,
	guildCache,
	isAdminOrManager,
} from "#src/utils/misc.ts";

export const cooldown = 5;

const serverRegionOption: OptionFunc<SlashCommandStringOption> = (option) =>
	option
		.setName(i18n.t("option.serverRegion.name", { ns: "common", lng: "en" }))
		.setDescription(
			i18n.t("option.serverRegion.desc", { ns: "common", lng: "en" }),
		)
		.setRequired(true)
		.addChoices(
			config.albionServerRegions.map((region) => ({
				name: i18n.t(
					`phrases.${region.toLowerCase() as "americas" | "asia" | "europe"}`,
					{ ns: "common", lng: "en" },
				),
				value: region,
			})),
		);

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
				i18n.t("serverStatus.subcommands.channel.name", {
					ns: "commands",
					lng: "en",
				}),
			)
			.setDescription(
				i18n.t("serverStatus.subcommands.channel.desc", {
					ns: "commands",
					lng: "en",
				}),
			)
			.addChannelOption((option) =>
				option
					.setName(
						i18n.t("serverStatus.subcommands.channel.options.channel.name", {
							ns: "commands",
							lng: "en",
						}),
					)
					.setDescription(
						i18n.t("serverStatus.subcommands.channel.options.channel.desc", {
							ns: "commands",
							lng: "en",
						}),
					)
					.setRequired(true),
			),
	)
	.addSubcommandGroup((group) =>
		group
			.setName(
				i18n.t("serverStatus.group.regions.name", {
					ns: "commands",
					lng: "en",
				}),
			)
			.setDescription(
				i18n.t("serverStatus.group.regions.desc", {
					ns: "commands",
					lng: "en",
				}),
			)
			.addSubcommand((subcommand) =>
				subcommand
					.setName(
						i18n.t("serverStatus.group.regions.subcommands.add.name", {
							ns: "commands",
							lng: "en",
						}),
					)
					.setDescription(
						i18n.t("serverStatus.group.regions.subcommands.add.desc", {
							ns: "commands",
							lng: "en",
						}),
					)
					.addStringOption(serverRegionOption),
			)
			.addSubcommand((subcommand) =>
				subcommand
					.setName(
						i18n.t("serverStatus.group.regions.subcommands.remove.name", {
							ns: "commands",
							lng: "en",
						}),
					)
					.setDescription(
						i18n.t("serverStatus.group.regions.subcommands.remove.desc", {
							ns: "commands",
							lng: "en",
						}),
					)
					.addStringOption(serverRegionOption),
			)
			.addSubcommand((subcommand) =>
				subcommand
					.setName(
						i18n.t("serverStatus.group.regions.subcommands.view.name", {
							ns: "commands",
							lng: "en",
						}),
					)
					.setDescription(
						i18n.t("serverStatus.group.regions.subcommands.view.desc", {
							ns: "commands",
							lng: "en",
						}),
					),
			),
	)
	.setContexts(InteractionContextType.Guild);

// TODO: if all regions removed, disable command and notify user
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
			ephemeral: true,
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
		});
		return;
	}

	// Initial deferral to prevent timeouts
	await i.deferReply({ ephemeral: true });

	// Extract subcommand options
	const subcommand = i.options.getSubcommand();
	const subcommandGroup = i.options.getSubcommandGroup();

	// Handle add, remove, view regions
	if (subcommandGroup === "regions") {
		switch (subcommand) {
			case "add":
				await addRegion(cid, i, cachedGuild);
				break;
			case "remove":
				await removeRegion(cid, i, cachedGuild);
				break;
			case "view":
				await viewRegions(cid, i, cachedGuild);
				break;
		}

		return;
	}

	// Handle one of the other subcommands
	switch (subcommand) {
		case "enable":
			await enableNotifications(cid, i, cachedGuild);
			break;
		case "disable":
			await disableNotifications(cid, i, cachedGuild);
			break;
		case "channel":
			await setChannel(cid, i, cachedGuild);
			break;
	}
};
