import { db } from "#src/database/db.ts";
import { lootSplitBalances } from "#src/database/schema.ts";
import { config } from "#src/utils/config.ts";
import { createGenericEmbed, type GuildDetails } from "#src/utils/misc.ts";
import type { ChatInputCommandInteraction } from "discord.js";
import { and, eq } from "drizzle-orm";

async function handleViewBalance(
	cid: string,
	i: ChatInputCommandInteraction<"cached">,
	cache: GuildDetails,
) {
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
					description: "You have no balance in this server",
					color: config.colors.info,
				}),
			],
		});
		return;
	}

	await i.reply(`Your balance is ${balance}`);
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
