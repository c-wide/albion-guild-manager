import { performance } from "node:perf_hooks";
import { until } from "@open-draft/until";
import { PermissionsBitField, type ShardingManager } from "discord.js";
import { type AlbionServerRegion, config } from "#src/utils/config.ts";
import { logger } from "#src/utils/logger.ts";
import { getErrorMessage, sdks } from "#src/utils/misc.ts";

// TODO: investigate issue causing first status check to fail for Europe & Asia

type Server = {
	status: "online" | "offline" | null;
	timestamp: Date | null;
};

const servers = config.albionServerRegions.reduce<
	Record<AlbionServerRegion, Server>
>(
	(obj, region) => {
		obj[region] = {
			status: null,
			timestamp: null,
		};
		return obj;
	},
	{} as Record<AlbionServerRegion, Server>,
);

async function processServerStatus(
	manager: ShardingManager,
	region: AlbionServerRegion,
): Promise<void> {
	// Get target Albion server status
	const { status } = await sdks[region].getServerStatus();

	// I dont care if server is starting
	if (status === "starting") return;

	// Handle initial status when bot starts
	if (servers[region].status === null) {
		servers[region].status = status;
		return;
	}

	// Stop execution if current status is the same as stored status
	if (status === servers[region].status) return;

	logger.info(
		{
			oldStatus: servers[region].status,
			newStatus: status,
			oldTimestamp: servers[region].timestamp,
			newTimestamp: new Date(),
			region,
		},
		"Server status changed",
	);

	// Update stored server status
	servers[region].status = status;
	servers[region].timestamp = new Date();

	await manager.broadcastEval(
		(c, { region, status }) => {
			c.guilds.cache.forEach((g) => {
				// Get guild cache to check settings
				const cache = c.guildCache.get(g.id);
				if (!cache) return;

				// If they dont have the setting toggled, dont send an embed
				if (!cache.settings.get("server_status_toggle")) return;

				const regions = cache.settings.get("server_status_regions") as
					| AlbionServerRegion[]
					| undefined;

				// Stop if theyre not subscribed to this regions events
				if (!regions || !regions.includes(region)) return;

				// Get server status channel id if configured
				const channelId = cache.settings.get("server_status_channel") as
					| string
					| undefined;

				// Stop if no channel is configured
				if (!channelId) return;

				// Get target channel from guild
				const channel = g.channels.cache.get(channelId);

				// Check if the channel still exists
				if (!channel) return;

				// Check if the channel is configured correctly
				if (channel.isTextBased() === false) return;

				// Check if bot is still in guild
				if (g.members.me === null) return;

				// Check if bot has permissions to send messages in channel
				if (
					channel
						.permissionsFor(g.members.me)
						.has([
							PermissionsBitField.Flags.ViewChannel,
							PermissionsBitField.Flags.SendMessages,
						]) === false
				)
					return;

				// If everything is ok, send the embed
				channel.send({
					content: "",
					embeds: [
						{
							title: c.i18n.t("serverStatus.embeds.serverStatus.title", {
								ns: "commands",
								lng: g.preferredLocale,
								region,
							}),
							description: " ",
							fields: [
								{
									name: c.i18n.t(
										"serverStatus.embeds.serverStatus.fields.status.name",
										{
											ns: "commands",
											lng: g.preferredLocale,
										},
									),
									value: `\`\`\`${c.i18n.t(
										`serverStatus.embeds.serverStatus.fields.status.${status}`,
										{ ns: "commands", lng: g.preferredLocale },
									)}\`\`\``,
									inline: true,
								},
								{
									name: c.i18n.t(
										"serverStatus.embeds.serverStatus.fields.timestamp.name",
										{
											ns: "commands",
											lng: g.preferredLocale,
										},
									),
									value: `\`\`\`${new Date()
										.toUTCString()
										.split(" ")[4]
										.substring(0, 5)} UTC\`\`\``,
									inline: true,
								},
							],
							color:
								status === "online"
									? Number.parseInt(
											c.config.colors.success.replace("#", ""),
											16,
										)
									: Number.parseInt(c.config.colors.error.replace("#", ""), 16),
						},
					],
				});
			});
		},
		{ context: { region, status } },
	);
}

export function startServerStatusInterval(manager: ShardingManager): void {
	setInterval(async () => {
		const startTime = performance.now();
		logger.info("Beginning server status check");

		const { error } = await until(async () => {
			const promises = config.albionServerRegions.map((region) =>
				processServerStatus(manager, region)
					.then(() => ({ success: true, region, error: undefined }))
					.catch((error) => ({ success: false, region, error })),
			);

			const results = await Promise.all(promises);
			results.forEach((result) => {
				if (result.success === true) return;
				logger.error(
					{ region: result.region, error: result.error.message },
					"Error processing region server status",
				);
			});
		});

		const duration = performance.now() - startTime;

		if (error) {
			logger.error(
				{ durationMs: duration.toFixed(0), error: getErrorMessage(error) },
				"Error during server status interval",
			);
			return;
		}

		logger.info(
			{ durationMs: duration.toFixed(0) },
			"Finished server status check",
		);
	}, 60_000);
}
