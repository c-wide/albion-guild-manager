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

export async function enableNotifications(
	cid: string,
	i: ChatInputCommandInteraction,
	cache: GuildDetails,
): Promise<void> {
	// Check if notifications are already enabled
	if (cache.settings.get(Settings.ServerStatusToggle)) {
		logger.info({ cid }, "Notifications already enabled");
		await i.followUp({
			content: "",
			embeds: [
				createGenericEmbed({
					title: " ",
					description: i18n.t(
						"serverStatus.responses.notificationsAlreadyEnabled",
						{ ns: "commands", lng: i.locale },
					),
					color: config.colors.info,
				}),
			],
		});
		return;
	}

	// Check if server status settings are correct
	const channel = cache.settings.get(Settings.ServerStatusChannel) as
		| string
		| undefined;

	if (channel === undefined) {
		logger.info({ cid }, "Notification channel not configured");
		await i.followUp({
			content: "",
			embeds: [
				createGenericEmbed({
					title: " ",
					description: i18n.t("serverStatus.responses.channelNotConfigured", {
						ns: "commands",
						lng: i.locale,
					}),
					color: config.colors.warning,
				}),
			],
		});
		return;
	}

	const regions = (cache.settings.get(Settings.ServerStatusRegions) ??
		[]) as AlbionServerRegion[];

	if (regions.length === 0) {
		logger.info({ cid }, "No regions being tracked");
		await i.followUp({
			content: "",
			embeds: [
				createGenericEmbed({
					title: " ",
					description: i18n.t("serverStatus.responses.noRegionsTracked", {
						ns: "commands",
						lng: i.locale,
					}),
					color: config.colors.warning,
				}),
			],
		});
		return;
	}

	// Update database
	await db
		.insert(serverSettings)
		.values({
			serverId: cache.id,
			key: Settings.ServerStatusToggle,
			value: true,
		})
		.onConflictDoUpdate({
			target: [serverSettings.serverId, serverSettings.key],
			set: {
				value: true,
				updatedAt: new Date(),
			},
		});

	// Update cache
	cache.settings.set(Settings.ServerStatusToggle, true);

	// Log things
	logger.info({ cid }, "Notifications enabled");

	// Respond to the user
	await i.followUp({
		content: "",
		embeds: [
			createGenericEmbed({
				title: " ",
				description: i18n.t("serverStatus.responses.notificationsEnabled", {
					ns: "commands",
					lng: i.locale,
				}),
				color: config.colors.success,
			}),
		],
	});
}

export async function disableNotifications(
	cid: string,
	i: ChatInputCommandInteraction,
	cache: GuildDetails,
): Promise<void> {
	// Check if server status notifications are already disabled
	if (!cache.settings.get(Settings.ServerStatusToggle)) {
		logger.info({ cid }, "Notifications already disabled");
		await i.followUp({
			content: "",
			embeds: [
				createGenericEmbed({
					title: " ",
					description: i18n.t(
						"serverStatus.responses.notificationsAlreadyDisabled",
						{ ns: "commands", lng: i.locale },
					),
					color: config.colors.info,
				}),
			],
		});
		return;
	}

	// Update database
	await db
		.update(serverSettings)
		.set({ value: false, updatedAt: new Date() })
		.where(
			and(
				eq(serverSettings.serverId, cache.id),
				eq(serverSettings.key, Settings.ServerStatusToggle),
			),
		);

	// Update cache
	cache.settings.set(Settings.ServerStatusToggle, false);

	// Log things
	logger.info({ cid }, "Notifications disabled");

	// Respond to the user
	await i.followUp({
		content: "",
		embeds: [
			createGenericEmbed({
				title: " ",
				description: i18n.t("serverStatus.responses.notificationsDisabled", {
					ns: "commands",
					lng: i.locale,
				}),
				color: config.colors.success,
			}),
		],
	});
}
