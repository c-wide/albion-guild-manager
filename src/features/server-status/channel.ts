import { ChannelType, type ChatInputCommandInteraction } from "discord.js";
import { db } from "~/database/db";
import { serverSettings } from "~/database/schema";
import { config } from "~/utils/config";
import { createGenericEmbed, Settings, type GuildDetails } from "~/utils/misc";
import i18n from "~/utils/i18n";
import { logger } from "~/utils/logger";

export async function setChannel(
	cid: string,
	i: ChatInputCommandInteraction,
	cache: GuildDetails,
): Promise<void> {
	// Get target channel
	const channel = i.options.getChannel("channel", true);

	// Verify target channel is a text channel
	if (channel.type !== ChannelType.GuildText) {
		logger.info({ cid }, "Wrong channel type");
		await i.followUp({
			content: "",
			embeds: [
				createGenericEmbed({
					title: " ",
					description: i18n.t("serverStatus.responses.wrongChannelType", {
						ns: "commands",
						lng: i.locale,
					}),
					color: config.colors.warning,
				}),
			],
		});
		return;
	}

	// Check if the target channel is already the configured channel
	if (cache.settings.get(Settings.ServerStatusChannel) === channel.id) {
		logger.info({ cid }, "Already notification channel");
		await i.followUp({
			content: "",
			embeds: [
				createGenericEmbed({
					title: " ",
					description: i18n.t("serverStatus.responses.sameChannel", {
						ns: "commands",
						lng: i.locale,
					}),
					color: config.colors.info,
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
			key: Settings.ServerStatusChannel,
			value: `snowflake_${channel.id}`,
		})
		.onConflictDoUpdate({
			target: [serverSettings.serverId, serverSettings.key],
			set: {
				value: `snowflake_${channel.id}`,
				updatedAt: new Date(),
			},
		});

	// Update cache
	cache.settings.set(Settings.ServerStatusChannel, channel.id);

	// Log things
	logger.info({ cid, channelId: channel.id }, "Notification channel set");

	// Respond to the user
	await i.followUp({
		content: "",
		embeds: [
			createGenericEmbed({
				title: " ",
				description: i18n.t("serverStatus.responses.channelSet", {
					channelId: channel.id,
					ns: "commands",
					lng: i.locale,
				}),
				color: config.colors.success,
			}),
		],
	});
}