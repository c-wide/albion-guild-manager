import { until } from "@open-draft/until";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	type ChatInputCommandInteraction,
	ComponentType,
} from "discord.js";
import { and, eq } from "drizzle-orm";
import { db } from "#src/database/db.ts";
import { lootSplitBalances } from "#src/database/schema.ts";
import { sendAuditLog } from "#src/features/split/admin.ts";
import { config } from "#src/utils/config.ts";
import { logger } from "#src/utils/logger.ts";
import { type GuildDetails, createGenericEmbed } from "#src/utils/misc.ts";

async function handleViewBalance(
	cid: string,
	i: ChatInputCommandInteraction<"cached">,
	cache: GuildDetails,
): Promise<void> {
	const [record] = await db
		.select({
			balance: lootSplitBalances.balance,
		})
		.from(lootSplitBalances)
		.where(
			and(
				eq(lootSplitBalances.serverId, cache.id),
				eq(lootSplitBalances.memberId, i.user.id),
			),
		);

	logger.info({ cid }, "Viewing balance");

	await i.followUp({
		content: "",
		embeds: [
			createGenericEmbed({
				title: "Balance",
				description: `You have ${record?.balance ?? 0} silver`,
				color: config.colors.info,
			}),
		],
	});
}

async function handleTransferBalance(
	cid: string,
	i: ChatInputCommandInteraction<"cached">,
	cache: GuildDetails,
): Promise<void> {
	// Extract options
	const xferAmt = i.options.getInteger("amount", true);
	const tgtUser = i.options.getUser("user", true);

	// Check if user is trying to transfer to themselves
	if (i.user.id === tgtUser.id) {
		logger.info({ cid }, "Prevented self transfer");
		await i.followUp({
			content: "",
			embeds: [
				createGenericEmbed({
					title: "Transfer",
					description: "You can't transfer funds to yourself",
					color: config.colors.warning,
				}),
			],
		});
		return;
	}

	// Check if user is trying to transfer to a bot
	if (tgtUser.bot) {
		logger.info({ cid }, "Prevented bot transfer");
		await i.followUp({
			content: "",
			embeds: [
				createGenericEmbed({
					title: "Transfer",
					description: "You can't transfer funds to a bot",
					color: config.colors.warning,
				}),
			],
		});
		return;
	}

	// Create buttons for confirming or canceling the transfer
	const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setCustomId("confirm")
			.setLabel("Confirm")
			.setStyle(ButtonStyle.Primary),
		new ButtonBuilder()
			.setCustomId("cancel")
			.setLabel("Cancel")
			.setStyle(ButtonStyle.Danger),
	);

	// Send a message with the confirmation embed and buttons
	const confirmMsg = await i.followUp({
		content: "",
		embeds: [
			createGenericEmbed({
				title: "Transfer",
				description: `Are you sure you want to transfer ${xferAmt} silver to <@${tgtUser.id}>?`,
				color: config.colors.info,
			}),
		],
		components: [confirmRow],
	});

	// Wait for the user to confirm or cancel
	const { error: confirmErr, data: confirmData } = await until(() =>
		confirmMsg.awaitMessageComponent({
			filter: (mi) => mi.user.id === i.user.id,
			time: 60_000,
			componentType: ComponentType.Button,
		}),
	);

	// If there was an error or cancelation, delete the confirmation message and return early
	if (confirmErr || confirmData.customId === "cancel") {
		logger.info({ cid }, "Transfer canceled");
		await i.deleteReply();
		return;
	}

	// Defer update to prevent timeouts
	await confirmData.deferUpdate();

	// Sort ids to prevent deadlocks
	const [firstId, secondId] = [i.user.id, tgtUser.id].sort();

	const success = await db.transaction(async (tx) => {
		// Fetch and lock records
		const [firstRecord] = await tx
			.select({
				id: lootSplitBalances.id,
				balance: lootSplitBalances.balance,
			})
			.from(lootSplitBalances)
			.where(
				and(
					eq(lootSplitBalances.serverId, cache.id),
					eq(lootSplitBalances.memberId, firstId),
				),
			)
			.for("update");

		const [secondRecord] = await tx
			.select({
				id: lootSplitBalances.id,
				balance: lootSplitBalances.balance,
			})
			.from(lootSplitBalances)
			.where(
				and(
					eq(lootSplitBalances.serverId, cache.id),
					eq(lootSplitBalances.memberId, secondId),
				),
			)
			.for("update");

		// Map results to source and target records
		const srcRecord = firstId === i.user.id ? firstRecord : secondRecord;
		const tgtRecord = firstId === i.user.id ? secondRecord : firstRecord;

		// Check if source has enough balance
		if (!srcRecord || srcRecord.balance < xferAmt) {
			return false;
		}

		// Update balances
		await Promise.all([
			tx
				.update(lootSplitBalances)
				.set({
					balance: srcRecord.balance - xferAmt,
				})
				.where(eq(lootSplitBalances.id, srcRecord.id)),
			tx
				.insert(lootSplitBalances)
				.values({
					serverId: cache.id,
					memberId: tgtUser.id,
					balance: xferAmt,
				})
				.onConflictDoUpdate({
					target: [lootSplitBalances.serverId, lootSplitBalances.memberId],
					set: {
						balance: (tgtRecord?.balance ?? 0) + xferAmt,
					},
				}),
		]);

		return true;
	});

	// If the transfer was unsuccessful, send a message and return early
	if (!success) {
		logger.info({ cid }, "Insufficient funds for transfer");
		await confirmData.editReply({
			content: "",
			embeds: [
				createGenericEmbed({
					title: "Transfer",
					description: "You don't have enough funds to complete the transfer",
					color: config.colors.warning,
				}),
			],
			components: [],
		});
		return;
	}

	// Log things
	logger.info(
		{ cid, srcId: i.user.id, tgtId: tgtUser.id, xferAmt },
		"Transfer complete",
	);

	// Notify the user of the successful transfer
	await confirmData.editReply({
		content: "",
		embeds: [
			createGenericEmbed({
				title: "Transfer",
				description: `Successfully transferred ${xferAmt} silver to <@${tgtUser.id}>`,
				color: config.colors.info,
			}),
		],
		components: [],
	});

	await sendAuditLog(
		cid,
		i,
		cache,
		createGenericEmbed({
			title: "Transfer",
			description: `<@${i.user.id}> transferred ${xferAmt} silver to <@${tgtUser.id}>`,
			color: config.colors.info,
		}),
	);
}

export async function handleBalanceActions(
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
			await handleTransferBalance(cid, i, cache);
			break;
		}
	}
}
