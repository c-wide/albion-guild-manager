import { until } from "@open-draft/until";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	type ChatInputCommandInteraction,
	ComponentType,
	PermissionFlagsBits,
} from "discord.js";
import { and, eq } from "drizzle-orm";
import { db } from "#src/database/db.ts";
import { lootSplitBalances, serverSettings } from "#src/database/schema.ts";
import { config } from "#src/utils/config.ts";
import { logger } from "#src/utils/logger.ts";
import {
	type GuildDetails,
	Settings,
	createGenericEmbed,
} from "#src/utils/misc.ts";

async function handlePayout(
	cid: string,
	i: ChatInputCommandInteraction<"cached">,
	cache: GuildDetails,
) {
	// Extract options
	const xferAmt = i.options.getInteger("amount", true);
	const user = i.options.getUser("user", true);

	// Create buttons for confirming or canceling the payout
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
				title: "Payout",
				description: `Are you sure you want to pay out ${xferAmt} silver to <@${user.id}>?`,
				color: config.colors.info,
			}),
		],
		components: [confirmRow],
	});

	// Wait for the user to confirm or cancel
	const { error: confirmErr, data: confirmData } = await until(() =>
		confirmMsg.awaitMessageComponent({
			filter: (mi) => mi.user.id === i.user.id,
			time: 3 * 60_000,
			componentType: ComponentType.Button,
		}),
	);

	// If there was an error or cancelation, delete the confirmation message and return early
	if (confirmErr || confirmData.customId === "cancel") {
		logger.info({ cid }, "Payout canceled");
		await i.deleteReply();
		return;
	}

	// Defer confirmation update
	await confirmData.deferUpdate();

	await db.transaction(async (tx) => {
		// Fetch and lock record
		const [record] = await tx
			.select({
				id: lootSplitBalances.id,
				balance: lootSplitBalances.balance,
			})
			.from(lootSplitBalances)
			.where(
				and(
					eq(lootSplitBalances.serverId, cache.id),
					eq(lootSplitBalances.memberId, user.id),
				),
			)
			.for("update");

		// Check if the user has enough balance
		if (record.balance < xferAmt) {
			logger.info({ cid }, "Insufficient balance for payout");
			await confirmData.editReply({
				content: "",
				embeds: [
					createGenericEmbed({
						title: "Payout",
						description: "User does not have enough balance",
						color: config.colors.warning,
					}),
				],
				components: [],
			});
			return;
		}

		// Update balance
		await tx
			.update(lootSplitBalances)
			.set({ balance: record.balance - xferAmt })
			.where(eq(lootSplitBalances.id, record.id));

		logger.info({ cid, target: user.id, xferAmt }, "Payout successful");

		// Notify user of payout
		await confirmData.editReply({
			content: "",
			embeds: [
				createGenericEmbed({
					title: "Payout",
					description: `Paid out ${xferAmt} silver to <@${user.id}>`,
					color: config.colors.info,
				}),
			],
			components: [],
		});
	});
}

async function handleViewBalance(
	cid: string,
	i: ChatInputCommandInteraction<"cached">,
	cache: GuildDetails,
): Promise<void> {
	// Extract options
	const user = i.options.getUser("user", true);

	// Fetch balance
	const [record] = await db
		.select({
			balance: lootSplitBalances.balance,
		})
		.from(lootSplitBalances)
		.where(
			and(
				eq(lootSplitBalances.serverId, cache.id),
				eq(lootSplitBalances.memberId, user.id),
			),
		);

	// Log things
	logger.info(
		{ cid, adminId: i.user.id, tgtId: user.id },
		"Admin viewing balance",
	);

	// Send message with balance
	await i.followUp({
		content: "",
		embeds: [
			createGenericEmbed({
				title: "Balance",
				description: `<@${user.id}> has ${record?.balance ?? 0} silver`,
				color: config.colors.info,
			}),
		],
	});
}

async function handleSetBalance(
	cid: string,
	i: ChatInputCommandInteraction<"cached">,
	cache: GuildDetails,
) {
	// Extract options
	const newTotal = i.options.getInteger("amount", true);
	const user = i.options.getUser("user", true);

	// Check if the user is a bot
	if (user.bot) {
		await i.followUp({
			content: "",
			embeds: [
				createGenericEmbed({
					title: "Set Balance",
					description: "Bots cannot have a silver balance",
					color: config.colors.warning,
				}),
			],
		});
		return;
	}

	// Create buttons for confirming or canceling the operation
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
				title: "Set Balance",
				description: `Are you sure you want to set <@${user.id}>'s balance to ${newTotal} silver?`,
				color: config.colors.info,
			}),
		],
		components: [confirmRow],
	});

	// Wait for the user to confirm or cancel
	const { error: confirmErr, data: confirmData } = await until(() =>
		confirmMsg.awaitMessageComponent({
			filter: (mi) => mi.user.id === i.user.id,
			time: 3 * 60_000,
			componentType: ComponentType.Button,
		}),
	);

	// If there was an error or cancelation, delete the confirmation message and return early
	if (confirmErr || confirmData.customId === "cancel") {
		logger.info({ cid }, "Set balance canceled");
		await i.deleteReply();
		return;
	}

	// Defer confirmation update
	await confirmData.deferUpdate();

	// Set balance
	await db
		.insert(lootSplitBalances)
		.values({
			serverId: cache.id,
			memberId: user.id,
			balance: newTotal,
		})
		.onConflictDoUpdate({
			target: [lootSplitBalances.serverId, lootSplitBalances.memberId],
			set: {
				balance: newTotal,
			},
		});

	logger.info(
		{ cid, adminId: i.user.id, tgtId: user.id, newTotal },
		"Admin set balance",
	);

	// Notify user of balance change
	await confirmData.editReply({
		content: "",
		embeds: [
			createGenericEmbed({
				title: "Set Balance",
				description: `Set <@${user.id}>'s balance to ${newTotal} silver`,
				color: config.colors.info,
			}),
		],
		components: [],
	});
}

async function handleSetManagerRole(
	cid: string,
	i: ChatInputCommandInteraction<"cached">,
	cache: GuildDetails,
) {
	// Only users with ManageGuild permission can set split manager role
	if (i.memberPermissions.has(PermissionFlagsBits.ManageGuild) === false) {
		logger.info({ cid }, "User lacks permission to set manager role");
		await i.followUp({
			content: "",
			embeds: [
				createGenericEmbed({
					title: "Set Manager Role",
					description: "You lack permission to set the split manager role",
					color: config.colors.warning,
				}),
			],
		});
		return;
	}

	// Extract options
	const role = i.options.getRole("role", true);

	// Check if role is managed
	if (role.managed) {
		await i.followUp({
			content: "",
			embeds: [
				createGenericEmbed({
					title: "Set Manager Role",
					description:
						"Bot managed roles cannot be set as the split manager role",
					color: config.colors.warning,
				}),
			],
		});
		return;
	}

	// Create buttons for confirming or canceling the action
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
				title: "Set Manager Role",
				description: `Are you sure you want to set the split manager role to <@&${role.id}>?`,
				color: config.colors.info,
			}),
		],
		components: [confirmRow],
	});

	// Wait for the user to confirm or cancel
	const { error: confirmErr, data: confirmData } = await until(() =>
		confirmMsg.awaitMessageComponent({
			filter: (mi) => mi.user.id === i.user.id,
			time: 3 * 60_000,
			componentType: ComponentType.Button,
		}),
	);

	// If there was an error or cancelation, delete the confirmation message and return early
	if (confirmErr || confirmData.customId === "cancel") {
		logger.info({ cid }, "Set manager role canceled");
		await i.deleteReply();
		return;
	}

	// Defer confirmation update
	await confirmData.deferUpdate();

	// Update db
	await db
		.insert(serverSettings)
		.values({
			serverId: cache.id,
			key: Settings.SplitManagerRole,
			value: `snowflake_${role.id}`,
		})
		.onConflictDoUpdate({
			target: [serverSettings.serverId, serverSettings.key],
			set: {
				value: `snowflake_${role.id}`,
				updatedAt: new Date(),
			},
		});

	// Set manager role
	cache.settings.set(Settings.SplitManagerRole, role.id);

	// Log things
	logger.info({ cid, roleId: role.id }, "Manager role set");

	// Notify user of role change
	await confirmData.editReply({
		content: "",
		embeds: [
			createGenericEmbed({
				title: "Set Manager Role",
				description: `Set the split manager role to <@&${role.id}>`,
				color: config.colors.info,
			}),
		],
		components: [],
	});
}

export async function handleAdminActions(
	cid: string,
	i: ChatInputCommandInteraction<"cached">,
	cache: GuildDetails,
) {
	switch (i.options.getSubcommand()) {
		case "payout": {
			await handlePayout(cid, i, cache);
			break;
		}
		case "view_balance": {
			await handleViewBalance(cid, i, cache);
			break;
		}
		case "set_balance": {
			await handleSetBalance(cid, i, cache);
			break;
		}
		case "set_manager_role": {
			await handleSetManagerRole(cid, i, cache);
			break;
		}
	}
}
