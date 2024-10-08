import type { ChatInputCommandInteraction } from "discord.js";
import { and, eq } from "drizzle-orm";
import { db } from "~/database/db";
import { serverSettings } from "~/database/schema";
import { config, type AlbionServerRegion } from "~/utils/config";
import { createGenericEmbed, Settings, type GuildDetails } from "~/utils/misc";

export async function addRegion(
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
	await i.followUp({
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

export async function removeRegion(
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
	await i.followUp({
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

export async function viewRegions(
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
	await i.followUp({
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
