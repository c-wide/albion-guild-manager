import { until } from "@open-draft/until";
import {
	ActionRowBuilder,
	AttachmentBuilder,
	ButtonBuilder,
	ButtonStyle,
	type ChatInputCommandInteraction,
	ComponentType,
	PermissionsBitField,
	type TextChannel,
} from "discord.js";
import { and, eq } from "drizzle-orm";
import * as XLSX from "xlsx";
import { db } from "#src/database/db.ts";
import { lootSplitBalances, serverSettings } from "#src/database/schema.ts";
import { config } from "#src/utils/config.ts";
import { logger } from "#src/utils/logger.ts";
import {
	type GuildDetails,
	Settings,
	arrayToCSV,
	createGenericEmbed,
	isAdminOrManager,
} from "#src/utils/misc.ts";

async function handlePayout(
	cid: string,
	i: ChatInputCommandInteraction<"cached">,
	cache: GuildDetails,
): Promise<void> {
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
			time: 60_000,
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
	});

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

	// Check if guild has a split audit log channel
	const auditLogChannelId = cache.settings.get(Settings.SplitAuditLogChannel) as
		| string
		| undefined;
	if (!auditLogChannelId) return;

	// Check if the channel still exists
	const auditLogChannel = i.guild.channels.cache.get(auditLogChannelId);
	if (!auditLogChannel) return;

	// Check if bot is still in the guild
	if (i.guild.members.me === null) return;

	// Check if bot has permissions to send messages in the channel
	const canSendMessages = auditLogChannel
		.permissionsFor(i.guild.members.me)
		.has([
			PermissionsBitField.Flags.ViewChannel,
			PermissionsBitField.Flags.SendMessages,
		]);
	if (!canSendMessages) return;

	// Send the split details to the audit log channel
	await (auditLogChannel as TextChannel).send({
		content: "",
		embeds: [
			createGenericEmbed({
				title: "Payout",
				description: `<@${i.user.id}> paid out ${xferAmt} silver to <@${user.id}>`,
				color: config.colors.info,
			}),
		],
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
): Promise<void> {
	// Extract options
	const newTotal = i.options.getInteger("amount", true);
	const user = i.options.getUser("user", true);

	// Check if the user is a bot
	if (user.bot) {
		logger.info({ cid }, "Prevented setting balance for bot");
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
			time: 60_000,
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

	// Check if guild has a split audit log channel
	const auditLogChannelId = cache.settings.get(Settings.SplitAuditLogChannel) as
		| string
		| undefined;
	if (!auditLogChannelId) return;

	// Check if the channel still exists
	const auditLogChannel = i.guild.channels.cache.get(auditLogChannelId);
	if (!auditLogChannel) return;

	// Check if bot is still in the guild
	if (i.guild.members.me === null) return;

	// Check if bot has permissions to send messages in the channel
	const canSendMessages = auditLogChannel
		.permissionsFor(i.guild.members.me)
		.has([
			PermissionsBitField.Flags.ViewChannel,
			PermissionsBitField.Flags.SendMessages,
		]);
	if (!canSendMessages) return;

	// Send the split details to the audit log channel
	await (auditLogChannel as TextChannel).send({
		content: "",
		embeds: [
			createGenericEmbed({
				title: "Set Balance",
				description: `<@${i.user.id}> set <@${user.id}>'s balance to ${newTotal} silver`,
				color: config.colors.info,
			}),
		],
	});
}

async function handleSetManagerRole(
	cid: string,
	i: ChatInputCommandInteraction<"cached">,
	cache: GuildDetails,
): Promise<void> {
	// Check if user has permission to change the manager role
	if (!isAdminOrManager(i.member, cache)) {
		logger.info({ cid }, "User lacks permission to change manager role");
		await i.followUp({
			content: "",
			embeds: [
				createGenericEmbed({
					title: " ",
					description:
						"You do not have permission to change the split manager role",
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
		logger.info(
			{ cid, roleId: role.id },
			"Prevented setting managed role as manager role",
		);
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
			time: 60_000,
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

async function handleSetAuditLogChannel(
	cid: string,
	i: ChatInputCommandInteraction<"cached">,
	cache: GuildDetails,
): Promise<void> {
	// Check if user has permission to change the manager role
	if (!isAdminOrManager(i.member, cache)) {
		logger.info({ cid }, "User lacks permission to change audit log channel");
		await i.followUp({
			content: "",
			embeds: [
				createGenericEmbed({
					title: " ",
					description:
						"You do not have permission to change the audit log channel",
					color: config.colors.warning,
				}),
			],
		});
		return;
	}

	// Check if bot is still in the guild I guess...
	if (i.guild.members.me === null) throw new Error("Bot is not in guild");

	// Extract options
	const channel = i.options.getChannel("channel", true);

	// Check if we can send messages in the selected channel
	const canSendMessages = channel
		.permissionsFor(i.guild.members.me)
		.has([
			PermissionsBitField.Flags.ViewChannel,
			PermissionsBitField.Flags.SendMessages,
		]);

	if (canSendMessages === false) {
		logger.info({ cid }, "Cant send messages in selected channel");
		await i.followUp({
			content: "",
			embeds: [
				createGenericEmbed({
					title: "Setup Audit Log",
					description:
						"Bot lacks permission to view and send messages in the selected channel",
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
				title: "Setup Audit Log",
				description: `Are you sure you want to set the audit log channel to <#${channel.id}>?`,
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
		logger.info({ cid }, "Audit log channel setup canceled");
		await i.deleteReply();
		return;
	}

	// Defer confirmation to avoid timeout
	await confirmData.deferUpdate();

	// Update db
	await db
		.insert(serverSettings)
		.values({
			serverId: cache.id,
			key: Settings.SplitAuditLogChannel,
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
	cache.settings.set(Settings.SplitAuditLogChannel, channel.id);

	// Log things
	logger.info({ cid, channelId: channel.id }, "Audit log channel set");

	// Notify user of channel change
	await confirmData.editReply({
		content: "",
		embeds: [
			createGenericEmbed({
				title: "Setup Audit Log",
				description: `Set the audit log channel to <#${channel.id}>`,
				color: config.colors.success,
			}),
		],
		components: [],
	});
}

async function handleExport(
	cid: string,
	i: ChatInputCommandInteraction<"cached">,
	cache: GuildDetails,
): Promise<void> {
	// Extract options
	const format = i.options.getString("format", true);

	// Fetch all balance data for the server
	const data = await db
		.select({
			memberId: lootSplitBalances.memberId,
			balance: lootSplitBalances.balance,
		})
		.from(lootSplitBalances)
		.where(eq(lootSplitBalances.serverId, cache.id));

	// Create attachment based on format
	let attachment: AttachmentBuilder | null = null;
	switch (format) {
		case "CSV": {
			const buffer = Buffer.from(arrayToCSV(data), "utf-8");
			attachment = new AttachmentBuilder(buffer, {
				name: "export.csv",
			});
			break;
		}
		case "JSON": {
			const buffer = Buffer.from(JSON.stringify(data, null, 2), "utf-8");
			attachment = new AttachmentBuilder(buffer, {
				name: "export.json",
			});
			break;
		}
		case "XLSX": {
			const workbook = XLSX.utils.book_new();
			const worksheet = XLSX.utils.json_to_sheet(data);
			XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

			const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

			attachment = new AttachmentBuilder(buffer, {
				name: "export.xlsx",
			});

			break;
		}
	}

	// Check if attachment was created
	if (!attachment) throw new Error("Failed to create attachment");

	// Log things
	logger.info({ cid, format }, "Exporting data");

	// Send the attachment
	await i.followUp({
		content: "",
		files: [attachment],
	});
}

export async function handleReset(
	cid: string,
	i: ChatInputCommandInteraction<"cached">,
	cache: GuildDetails,
): Promise<void> {
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
				title: "Reset Balances",
				description: "Are you sure you want to reset all balances?",
				color: config.colors.warning,
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
		logger.info({ cid }, "Reset balances canceled");
		await i.deleteReply();
		return;
	}

	// Defer confirmation to avoid timeout
	await confirmData.deferUpdate();

	// Reset balances
	await db
		.delete(lootSplitBalances)
		.where(eq(lootSplitBalances.serverId, cache.id));

	// Log things
	logger.info({ cid }, "Balances reset");

	// Notify user of reset
	await confirmData.editReply({
		content: "",
		embeds: [
			createGenericEmbed({
				title: "Reset Balances",
				description: "All balances have been reset",
				color: config.colors.success,
			}),
		],
		components: [],
	});

	// Check if guild has a split audit log channel
	const auditLogChannelId = cache.settings.get(Settings.SplitAuditLogChannel) as
		| string
		| undefined;
	if (!auditLogChannelId) return;

	// Check if the channel still exists
	const auditLogChannel = i.guild.channels.cache.get(auditLogChannelId);
	if (!auditLogChannel) return;

	// Check if bot is still in the guild
	if (i.guild.members.me === null) return;

	// Check if bot has permissions to send messages in the channel
	const canSendMessages = auditLogChannel
		.permissionsFor(i.guild.members.me)
		.has([
			PermissionsBitField.Flags.ViewChannel,
			PermissionsBitField.Flags.SendMessages,
		]);
	if (!canSendMessages) return;

	// Send the details to the audit log channel
	await (auditLogChannel as TextChannel).send({
		content: "",
		embeds: [
			createGenericEmbed({
				title: "Reset Balances",
				description: `<@${i.user.id}> reset all balances`,
				color: config.colors.info,
			}),
		],
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
		case "set_audit_log_channel": {
			await handleSetAuditLogChannel(cid, i, cache);
			break;
		}
		case "export": {
			await handleExport(cid, i, cache);
			break;
		}
		case "reset": {
			await handleReset(cid, i, cache);
			break;
		}
	}
}
