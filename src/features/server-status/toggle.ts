import type { ChatInputCommandInteraction } from "discord.js";
import { and, eq } from "drizzle-orm";
import { db } from "~/database/db";
import { serverSettings } from "~/database/schema";
import { config, type AlbionServerRegion } from "~/utils/config";
import { createGenericEmbed, Settings, type GuildDetails } from "~/utils/misc";
import i18n from "~/utils/i18n";

export async function enableNotifications(
	cid: string,
	i: ChatInputCommandInteraction,
	cache: GuildDetails,
): Promise<void> {
	// Check if notifications are already enabled
	if (cache.settings.get(Settings.ServerStatusToggle)) {
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
