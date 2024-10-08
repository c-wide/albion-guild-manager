import assert from "node:assert";
import {
	ChatInputCommandInteraction,
	InteractionContextType,
	SlashCommandBuilder,
	type SlashCommandStringOption,
} from "discord.js";
import type { CommandHandler } from "~/utils/command";
import { config } from "~/utils/config";
import i18n from "~/utils/i18n";
import {
	createGenericEmbed,
	guildCache,
	isAdminOrManager,
	Settings,
	type GuildDetails,
	type OptionFunc,
} from "~/utils/misc";
import {
	addRegion,
	removeRegion,
	viewRegions,
} from "~/features/server-status/region";

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
	.setName("serverstatus")
	.setDescription("Configure Albion Online server status announcements")
	.addSubcommand((subcommand) =>
		subcommand
			.setName("enable")
			.setDescription("Enable server status announcements"),
	)
	.addSubcommand((subcommand) =>
		subcommand
			.setName("disable")
			.setDescription("Disable server status announcements"),
	)
	.addSubcommand((subcommand) =>
		subcommand
			.setName("channel")
			.setDescription("Set the channel for announcements")
			.addChannelOption((option) =>
				option
					.setName("channel")
					.setDescription("The channel to send announcements to")
					.setRequired(true),
			),
	)
	.addSubcommandGroup((group) =>
		group
			.setName("regions")
			.setDescription("Manage tracked regions")
			.addSubcommand((subcommand) =>
				subcommand
					.setName("add")
					.setDescription("Add a region")
					.addStringOption(serverRegionOption),
			)
			.addSubcommand((subcommand) =>
				subcommand
					.setName("remove")
					.setDescription("Remove a region")
					.addStringOption(serverRegionOption),
			)
			.addSubcommand((subcommand) =>
				subcommand
					.setName("view")
					.setDescription("View currently configured regions"),
			),
	)
	.setContexts(InteractionContextType.Guild);

export const handler: CommandHandler = async ({ cid, i }) => {
	// Retreive cached guild
	const cachedGuild = guildCache.get(i.guildId ?? "");
	assert(cachedGuild, "Guild not found in cache");

	// Only server admins or managers can use these commands
	if (!isAdminOrManager(i.member, cachedGuild)) {
		await i.reply({
			content: "you dont have permission to use this command",
			ephemeral: true,
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
			break;
		case "channel":
			break;
	}
};

async function enableNotifications(
	cid: string,
	i: ChatInputCommandInteraction,
	cache: GuildDetails,
): Promise<void> {
	// check if already enabled
	if (cache.settings.get(Settings.ServerStatusToggle) === true) {
		await i.followUp({
			content: "",
			embeds: [
				createGenericEmbed({
					title: " ",
					description: "Server status notifications are already enabled",
					color: config.colors.warning,
				}),
			],
		});
		return;
	}

	// check if settings are correct
	// update db
	// update cache
}
