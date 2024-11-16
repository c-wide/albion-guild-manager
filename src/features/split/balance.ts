import { db } from "#src/database/db.ts";
import { lootSplitBalances } from "#src/database/schema.ts";
import { config } from "#src/utils/config.ts";
import { logger } from "#src/utils/logger.ts";
import { createGenericEmbed, type GuildDetails } from "#src/utils/misc.ts";
import type { ChatInputCommandInteraction } from "discord.js";
import { and, eq } from "drizzle-orm";

async function handleViewBalance(
	cid: string,
	i: ChatInputCommandInteraction<"cached">,
	cache: GuildDetails,
) {
	logger.info({ cid }, "Viewing balance");

	const { balance } = await db
		.select({
			balance: lootSplitBalances.balance,
		})
		.from(lootSplitBalances)
		.where(
			and(
				eq(lootSplitBalances.serverId, cache.id),
				eq(lootSplitBalances.memberId, i.user.id),
			),
		)
		.then((r) => r[0] ?? {});

	if (!balance) {
		await i.followUp({
			content: "",
			embeds: [
				createGenericEmbed({
					title: "Balance",
					description: "You don't have a balance on this server yet",
					color: config.colors.info,
				}),
			],
		});
		return;
	}

	await i.followUp({
		content: "",
		embeds: [
			createGenericEmbed({
				title: "Balance",
				description: `Your balance is ${balance}`,
				color: config.colors.info,
			}),
		],
	});
}

export async function handleBalanceCommand(
	cid: string,
	i: ChatInputCommandInteraction<"cached">,
	cache: GuildDetails,
) {
	switch (i.options.getSubcommand()) {
		case "view": {
			await handleViewBalance(cid, i, cache);
			break;
		}
		case "transfer": {
			break;
		}
	}
}
