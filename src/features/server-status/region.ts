import type { ChatInputCommandInteraction } from "discord.js";
import { and, eq } from "drizzle-orm";
import { db } from "#src/database/db.ts";
import { serverSettings } from "#src/database/schema.ts";
import { type AlbionServerRegion, config } from "#src/utils/config.ts";
import i18n from "#src/utils/i18n.ts";
import { logger } from "#src/utils/logger.ts";
import {
	type GuildDetails,
	Settings,
	createGenericEmbed,
} from "#src/utils/misc.ts";

export async function addRegion(
	cid: string,
	i: ChatInputCommandInteraction<"cached">,
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
		logger.info({ cid }, "Region already being tracked");
		await i.followUp({
			content: "",
			embeds: [
				createGenericEmbed({
					title: " ",
					description: i18n.t(
						"serverStatus.responses.regionAlreadyConfigured",
						{ ns: "commands", lng: i.locale },
					),
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

	// Log things
	logger.info({ cid, newRegion }, "Region added");

	// Respond to the user
	await i.followUp({
		content: " ",
		embeds: [
			createGenericEmbed({
				title: " ",
				description: i18n.t("serverStatus.responses.regionAdded", {
					ns: "commands",
					lng: i.locale,
				}),
				color: config.colors.success,
			}),
		],
	});
}

export async function removeRegion(
	cid: string,
	i: ChatInputCommandInteraction<"cached">,
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
		logger.info({ cid }, "Region is not being tracked");
		await i.followUp({
			content: "",
			embeds: [
				createGenericEmbed({
					title: " ",
					description: i18n.t("serverStatus.responses.regionNotConfigured", {
						ns: "commands",
						lng: i.locale,
					}),
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

	// Log things
	logger.info({ cid, regionToRemove }, "Region removed");

	// Respond to the user
	await i.followUp({
		content: " ",
		embeds: [
			createGenericEmbed({
				title: " ",
				description: i18n.t("serverStatus.responses.regionRemoved", {
					ns: "commands",
					lng: i.locale,
				}),
				color: config.colors.success,
			}),
		],
	});
}

export async function viewRegions(
	cid: string,
	i: ChatInputCommandInteraction<"cached">,
	cache: GuildDetails,
): Promise<void> {
	// Get configured regions from cache
	const configuredRegions = (cache.settings.get(Settings.ServerStatusRegions) ??
		[]) as AlbionServerRegion[];

	// If no regions are configured, notify and bail
	if (configuredRegions.length === 0) {
		logger.info({ cid }, "No regions being tracked");
		await i.followUp({
			content: "",
			embeds: [
				createGenericEmbed({
					title: " ",
					description: i18n.t("serverStatus.responses.noRegionsConfigured", {
						ns: "commands",
						lng: i.locale,
					}),
					color: config.colors.info,
				}),
			],
		});
		return;
	}

	// Log things
	logger.info({ cid }, "Displaying tracked regions");

	// Respond to the user
	await i.followUp({
		content: " ",
		embeds: [
			createGenericEmbed({
				title: i18n.t("serverStatus.embeds.viewRegions.title", {
					ns: "commands",
					lng: i.locale,
				}),
				description: configuredRegions
					.map((region) =>
						i18n.t(
							`phrases.${
								region.toLowerCase() as "americas" | "europe" | "asia"
							}`,
							{ ns: "common", lng: i.locale },
						),
					)
					.join("\n"),
				color: config.colors.info,
			}),
		],
	});
}
