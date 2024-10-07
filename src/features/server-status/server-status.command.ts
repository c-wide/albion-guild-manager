import assert from "node:assert";
import {
	ChatInputCommandInteraction,
	InteractionContextType,
	SlashCommandBuilder,
	type SlashCommandStringOption,
} from "discord.js";
import type { CommandHandler } from "~/utils/command";
import { config, type AlbionServerRegion } from "~/utils/config";
import i18n from "~/utils/i18n";
import {
	createGenericEmbed,
	guildCache,
	isAdminOrManager,
	Settings,
	type GuildDetails,
	type OptionFunc,
} from "~/utils/misc";
import { db } from "~/database/db";
import { serverSettings } from "~/database/schema";
import { and, eq } from "drizzle-orm";

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

async function addRegion(
	cid: string,
	i: ChatInputCommandInteraction,
	cache: GuildDetails,
): Promise<void> {
	// Get region to be added from user provided option
	const newRegion = i.options.getString(
		"server_region",
		true,
	) as AlbionServerRegion;

	// Get already configured regions from cache
	const configuredRegions = (cache.settings.get(Settings.ServerStatusRegions) ??
		[]) as AlbionServerRegion[];

	// If region already exists in array, notify and bail
	if (configuredRegions.includes(newRegion)) {
		await i.followUp({
			content: "",
			embeds: [
				createGenericEmbed({
					title: " ",
					description: "Region already configured",
					color: config.colors.info,
				}),
			],
		});
		return;
	}

	// If region doesnt exist in array, add to array
	configuredRegions.push(newRegion);

	// Update db
	await db
		.insert(serverSettings)
		.values({
			serverId: cache.id,
			key: Settings.ServerStatusRegions,
			value: configuredRegions,
		})
		.onConflictDoUpdate({
			target: [serverSettings.serverId, serverSettings.key],
			set: {
				value: configuredRegions,
				updatedAt: new Date(),
			},
		});

	// Update cache
	cache.settings.set(Settings.ServerStatusRegions, configuredRegions);

	// Respond to the user
	i.followUp({
		content: " ",
		embeds: [
			createGenericEmbed({
				title: " ",
				description: "Region successfully added",
				color: config.colors.success,
			}),
		],
	});
}

async function removeRegion(
	cid: string,
	i: ChatInputCommandInteraction,
	cache: GuildDetails,
): Promise<void> {
	// Get region to be removed from user provided option
	const regionToRemove = i.options.getString(
		"server_region",
		true,
	) as AlbionServerRegion;

	// Get already configured regions from cache
	const configuredRegions = (cache.settings.get(Settings.ServerStatusRegions) ??
		[]) as AlbionServerRegion[];

	// If region doesnt exist in array, notify and bail
	if (!configuredRegions.includes(regionToRemove)) {
		await i.followUp({
			content: "",
			embeds: [
				createGenericEmbed({
					title: " ",
					description: "Region is not configured for your server",
					color: config.colors.info,
				}),
			],
		});
		return;
	}

	// If region does exist in array, remove it
	const newRegions = configuredRegions.filter(
		(region) => region !== regionToRemove,
	);

	// Update db
	await db
		.update(serverSettings)
		.set({
			value: newRegions,
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(serverSettings.serverId, cache.id),
				eq(serverSettings.key, Settings.ServerStatusRegions),
			),
		);

	// Update cache
	cache.settings.set(Settings.ServerStatusRegions, newRegions);

	// Respond to the user
	i.followUp({
		content: " ",
		embeds: [
			createGenericEmbed({
				title: " ",
				description: "Region successfully removed",
				color: config.colors.success,
			}),
		],
	});
}

async function viewRegions(
	cid: string,
	i: ChatInputCommandInteraction,
	cache: GuildDetails,
): Promise<void> {
	// Get configured regions from cache
	const configuredRegions = (cache.settings.get(Settings.ServerStatusRegions) ??
		[]) as AlbionServerRegion[];

	// If no regions are configured, notify and bail
	if (configuredRegions.length === 0) {
		await i.followUp({
			content: "",
			embeds: [
				createGenericEmbed({
					title: " ",
					description: "You have not added any regions",
					color: config.colors.info,
				}),
			],
		});
		return;
	}

	// Respond to the user
	i.followUp({
		content: " ",
		embeds: [
			createGenericEmbed({
				title: " ",
				description: `Configured regions: [${configuredRegions.join(", ")}]`,
				color: config.colors.info,
			}),
		],
	});
}

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
	}
};
