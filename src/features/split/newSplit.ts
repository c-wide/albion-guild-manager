import { until } from "@open-draft/until";
import {
	ActionRowBuilder,
	ButtonBuilder,
	type ButtonInteraction,
	ButtonStyle,
	type ChatInputCommandInteraction,
	ComponentType,
	EmbedBuilder,
	InteractionCollector,
	type Message,
	type ModalActionRowComponentBuilder,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	UserSelectMenuBuilder,
} from "discord.js";
import { Lootsplit } from "#src/features/split/lootsplit.ts";
import {
	createSplitAttachment,
	createSplitButtonRows,
	generateMemberListEmbeds,
	generateMemberListFields,
	generateSplitDetailsEmbed,
} from "#src/features/split/split-ui.ts";
import { config } from "#src/utils/config.ts";
import { logger } from "#src/utils/logger.ts";
import {
	type GuildDetails,
	createGenericEmbed,
	getErrorMessage,
} from "#src/utils/misc.ts";
import { PaginationEmbed } from "#src/utils/pagination.ts";
import { db } from "#src/database/db.ts";
import { lootSplitBalances } from "#src/database/schema.ts";
import { sql } from "drizzle-orm";

async function handleSetTax(
	i: ButtonInteraction,
	split: Lootsplit,
): Promise<void> {
	const modal = new ModalBuilder()
		.setCustomId(`taxRate-${i.id}`)
		.setTitle("Set Tax");

	const input = new TextInputBuilder()
		.setCustomId("taxInput")
		.setLabel("Tax Rate")
		.setValue(split.getTaxRate().toString())
		.setMinLength(1)
		.setMaxLength(3)
		.setRequired(true)
		.setStyle(TextInputStyle.Short);

	const row = new ActionRowBuilder<ModalActionRowComponentBuilder>();

	row.addComponents(input);
	modal.addComponents(row);

	await i.showModal(modal);

	const { error, data } = await until(() =>
		i.awaitModalSubmit({
			filter: (mi) => mi.customId === `taxRate-${i.id}`,
			time: 60_000,
		}),
	);

	if (error) return;
	if (!data.isFromMessage()) return;

	const taxRate = Number(data.fields.getTextInputValue("taxInput"));
	const success = split.setTaxRate(taxRate);

	if (!success) {
		logger.info(
			{
				splitId: split.getId(),
				taxRate,
			},
			"Invalid tax rate provided",
		);
		const res = await data.reply({
			content: "Invalid tax rate provided, must be a number between 0 and 100",
			ephemeral: true,
		});
		setTimeout(async () => await res.delete(), 10_000);
		return;
	}

	logger.info({ splitId: split.getId(), taxRate }, "Tax rate set successfully");

	await data.update({
		embeds: [generateSplitDetailsEmbed(split.getSplitDetails(), i.locale)],
	});
}

async function handleSetTotalAmount(
	i: ButtonInteraction,
	split: Lootsplit,
): Promise<void> {
	const modal = new ModalBuilder()
		.setCustomId(`totalAmount-${i.id}`)
		.setTitle("Set Total Amount");

	const input = new TextInputBuilder()
		.setCustomId("amountInput")
		.setLabel("Total Amount")
		.setValue(split.getTotalAmount().toString())
		.setMinLength(1)
		.setMaxLength(15)
		.setRequired(true)
		.setStyle(TextInputStyle.Short);

	const row = new ActionRowBuilder<ModalActionRowComponentBuilder>();
	row.addComponents(input);
	modal.addComponents(row);

	await i.showModal(modal);

	const { error, data } = await until(() =>
		i.awaitModalSubmit({
			filter: (mi) => mi.customId === `totalAmount-${i.id}`,
			time: 60_000,
		}),
	);

	if (error) return;
	if (!data.isFromMessage()) return;

	const totalAmount = Number(data.fields.getTextInputValue("amountInput"));
	const success = split.setTotalAmount(totalAmount);

	if (!success) {
		logger.info(
			{ splitId: split.getId(), totalAmount },
			"Invalid total amount provided",
		);
		const res = await data.reply({
			content: "Invalid amount provided",
			ephemeral: true,
		});
		setTimeout(async () => await res.delete(), 10_000);
		return;
	}

	logger.info(
		{ splitId: split.getId(), totalAmount },
		"Total amount set successfully",
	);

	await data.update({
		embeds: [generateSplitDetailsEmbed(split.getSplitDetails(), i.locale)],
	});
}

async function handleSetRepairCost(
	i: ButtonInteraction,
	split: Lootsplit,
): Promise<void> {
	const modal = new ModalBuilder()
		.setCustomId(`repairCost-${i.id}`)
		.setTitle("Set Repair Cost");

	const input = new TextInputBuilder()
		.setCustomId("repairInput")
		.setLabel("Repair Cost")
		.setValue(split.getRepairCost().toString())
		.setMinLength(1)
		.setMaxLength(15)
		.setRequired(true)
		.setStyle(TextInputStyle.Short);

	const row = new ActionRowBuilder<ModalActionRowComponentBuilder>();
	row.addComponents(input);
	modal.addComponents(row);

	await i.showModal(modal);

	const { error, data } = await until(() =>
		i.awaitModalSubmit({
			filter: (mi) => mi.customId === `repairCost-${i.id}`,
			time: 60_000,
		}),
	);

	if (error) return;
	if (!data.isFromMessage()) return;

	const repairCost = Number(data.fields.getTextInputValue("repairInput"));
	const success = split.setRepairCost(repairCost);

	if (!success) {
		logger.info(
			{ splitId: split.getId(), repairCost },
			"Invalid repair cost provided",
		);
		const res = await data.reply({
			content: "Invalid repair cost provided",
			ephemeral: true,
		});
		setTimeout(async () => await res.delete(), 10_000);
		return;
	}

	logger.info(
		{ splitId: split.getId(), repairCost },
		"Repair cost set successfully",
	);

	await data.update({
		embeds: [generateSplitDetailsEmbed(split.getSplitDetails(), i.locale)],
	});
}

async function handleAddMembers(
	i: ButtonInteraction<"cached">,
	split: Lootsplit,
	mainMessage: Message,
	memberList: PaginationEmbed,
): Promise<void> {
	const selectRow = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
		new UserSelectMenuBuilder()
			.setCustomId("addMembers")
			.setPlaceholder("Select up to 25 members")
			.setMinValues(1)
			.setMaxValues(25),
	);

	const selectMsg = await i.reply({
		content: "Select the members you want to add to the split",
		components: [selectRow],
		ephemeral: true,
		fetchReply: true,
	});

	const { error: selectErr, data: selectData } = await until(() =>
		selectMsg.awaitMessageComponent({
			filter: (mi) => mi.user.id === i.user.id,
			time: 5 * 60_000,
			componentType: ComponentType.UserSelect,
		}),
	);

	if (selectErr) {
		await selectMsg.delete();
		return;
	}

	const confirmEmbed = new EmbedBuilder()
		.setTitle("Confirm Members")
		.setDescription("Are you sure you want to add these members?")
		.setFields(generateMemberListFields(selectData.values))
		.setColor(config.colors.info);

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

	const confirmMsg = await selectData.update({
		content: "",
		embeds: [confirmEmbed],
		components: [confirmRow],
	});

	const { error: confirmErr, data: confirmData } = await until(() =>
		confirmMsg.awaitMessageComponent({
			filter: (mi) => mi.user.id === i.user.id,
			time: 5 * 60_000,
			componentType: ComponentType.Button,
		}),
	);

	if (confirmErr) {
		await confirmMsg.delete();
		return;
	}

	if (confirmData.customId === "cancel") {
		await confirmMsg.delete();
		return;
	}

	const members = selectData.members.map((member) => ({
		id: member.user.id,
		name: member.displayName,
	}));
	split.addMembers(members);

	logger.info({ splitId: split.getId(), members }, "Members added to split");

	await Promise.all([
		mainMessage.edit({
			embeds: [generateSplitDetailsEmbed(split.getSplitDetails(), i.locale)],
		}),
		memberList.setEmbeds(generateMemberListEmbeds(split.getMemberIds())),
		confirmMsg.delete(),
	]);
}

async function handleRemoveMembers(
	i: ButtonInteraction<"cached">,
	split: Lootsplit,
	mainMessage: Message,
	memberList: PaginationEmbed,
): Promise<void> {
	const selectRow = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
		new UserSelectMenuBuilder()
			.setCustomId("removeMembers")
			.setPlaceholder("Select up to 25 members")
			.setMinValues(1)
			.setMaxValues(25),
	);

	const selectMsg = await i.reply({
		content: "Select the members you want to remove from the split",
		components: [selectRow],
		ephemeral: true,
		fetchReply: true,
	});

	const { error: selectErr, data: selectData } = await until(() =>
		selectMsg.awaitMessageComponent({
			filter: (mi) => mi.user.id === i.user.id,
			time: 5 * 60_000,
			componentType: ComponentType.UserSelect,
		}),
	);

	if (selectErr) {
		await selectMsg.delete();
		return;
	}

	const confirmEmbed = new EmbedBuilder()
		.setTitle("Confirm Members")
		.setDescription("Are you sure you want to remove these members?")
		.setFields(generateMemberListFields(selectData.values))
		.setColor(config.colors.info);

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

	const confirmMsg = await selectData.update({
		content: "",
		embeds: [confirmEmbed],
		components: [confirmRow],
	});

	const { error: confirmErr, data: confirmData } = await until(() =>
		confirmMsg.awaitMessageComponent({
			filter: (mi) => mi.user.id === i.user.id,
			time: 5 * 60_000,
			componentType: ComponentType.Button,
		}),
	);

	if (confirmErr) {
		await confirmMsg.delete();
		return;
	}

	if (confirmData.customId === "cancel") {
		await confirmMsg.delete();
		return;
	}

	const members = selectData.members.map((member) => ({
		id: member.user.id,
		name: member.displayName,
	}));
	split.removeMembers(members);

	logger.info(
		{ splitId: split.getId(), members },
		"Members removed from split",
	);

	await Promise.all([
		mainMessage.edit({
			embeds: [generateSplitDetailsEmbed(split.getSplitDetails(), i.locale)],
		}),
		memberList.setEmbeds(generateMemberListEmbeds(split.getMemberIds())),
		confirmMsg.delete(),
	]);
}

async function handleAddFromVoice(
	i: ButtonInteraction<"cached">,
	split: Lootsplit,
	mainMessage: Message,
	memberList: PaginationEmbed,
): Promise<void> {
	const voiceChannel = i.member.voice.channel;
	if (!voiceChannel) {
		const res = await i.reply({
			content: "You must be in a voice channel to use this feature",
			ephemeral: true,
		});
		setTimeout(async () => await res.delete(), 10_000);
		return;
	}

	const members = voiceChannel.members.map((member) => ({
		id: member.user.id,
		name: member.displayName,
	}));

	const confirmEmbed = new EmbedBuilder()
		.setTitle("Confirm Members")
		.setDescription(
			`Are you sure you want to add ${members.length} members to the split?`,
		)
		.setColor(config.colors.info);

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

	const confirmMsg = await i.reply({
		content: "",
		embeds: [confirmEmbed],
		components: [confirmRow],
		ephemeral: true,
		fetchReply: true,
	});

	const { error: confirmErr, data: confirmData } = await until(() =>
		confirmMsg.awaitMessageComponent({
			filter: (mi) => mi.user.id === i.user.id,
			time: 5 * 60_000,
			componentType: ComponentType.Button,
		}),
	);

	if (confirmErr) {
		await i.deleteReply();
		return;
	}

	if (confirmData.customId === "cancel") {
		await i.deleteReply();
		return;
	}

	split.addMembers(members);

	logger.info(
		{ splitId: split.getId(), members },
		"Members added to split from voice channel",
	);

	await Promise.all([
		mainMessage.edit({
			embeds: [generateSplitDetailsEmbed(split.getSplitDetails(), i.locale)],
		}),
		memberList.setEmbeds(generateMemberListEmbeds(split.getMemberIds())),
		i.deleteReply(),
	]);
}

export async function handleCancelSplit(
	split: Lootsplit,
	mainMessage: Message,
	memberList: PaginationEmbed,
	collector: InteractionCollector<ButtonInteraction<"cached">>,
): Promise<void> {
	collector.stop();
	await Promise.all([mainMessage.delete(), memberList.cleanup()]);
	logger.info({ splitId: split.getId() }, "Split cancelled");
}

export async function createNewSplit(
	cid: string,
	i: ChatInputCommandInteraction<"cached">,
	cache: GuildDetails,
): Promise<void> {
	await i.deferReply();

	const split = new Lootsplit({ id: i.user.id, name: i.member.displayName });

	const memberList = new PaginationEmbed(
		generateMemberListEmbeds(split.getMemberIds()),
		{
			collectorTimeout: 3_600_000,
		},
	);

	const mainMessage = await i.followUp({
		content: "",
		embeds: [generateSplitDetailsEmbed(split.getSplitDetails(), i.locale)],
		components: createSplitButtonRows(),
	});
	await memberList.followUp(i);

	const collector = mainMessage.createMessageComponentCollector({
		filter: (mi) => mi.user.id === i.user.id,
		componentType: ComponentType.Button,
		time: 3_600_000,
	});

	logger.info({ cid, splitId: split.getId() }, "New split created");

	collector.on("collect", async (ci) => {
		try {
			switch (ci.customId) {
				case "setTax": {
					await handleSetTax(ci, split);
					break;
				}
				case "setTotalAmount": {
					await handleSetTotalAmount(ci, split);
					break;
				}
				case "setRepairCost": {
					await handleSetRepairCost(ci, split);
					break;
				}
				case "addMembers": {
					await handleAddMembers(ci, split, mainMessage, memberList);
					break;
				}
				case "removeMembers": {
					await handleRemoveMembers(ci, split, mainMessage, memberList);
					break;
				}
				case "addVoiceMembers": {
					await handleAddFromVoice(ci, split, mainMessage, memberList);
					break;
				}
				case "cancelSplit": {
					await handleCancelSplit(split, mainMessage, memberList, collector);
					break;
				}
				case "endSplit": {
					if (split.getTotalAmount() < 1) {
						await ci.reply({
							content: "You must set a total amount before ending the split",
							ephemeral: true,
						});
						setTimeout(async () => await ci.deleteReply(), 10_000);
						return;
					}

					if (split.getMemberCount() < 1) {
						await ci.reply({
							content:
								"You must have at least one member in the split to end it",
							ephemeral: true,
						});
						setTimeout(async () => await ci.deleteReply(), 10_000);
						return;
					}

					await mainMessage.edit({
						components: [],
					});

					const confirmRow =
						new ActionRowBuilder<ButtonBuilder>().addComponents(
							new ButtonBuilder()
								.setCustomId("confirm")
								.setLabel("Confirm")
								.setStyle(ButtonStyle.Primary),
							new ButtonBuilder()
								.setCustomId("cancel")
								.setLabel("Cancel")
								.setStyle(ButtonStyle.Danger),
						);

					const confirmMsg = await ci.reply({
						content: "",
						embeds: [
							createGenericEmbed({
								title: "Confirmation",
								description: "Are you sure you want to end the split?",
								color: config.colors.info,
							}),
						],
						components: [confirmRow],
						fetchReply: true,
					});

					const { error: confirmErr, data: confirmData } = await until(() =>
						confirmMsg.awaitMessageComponent({
							filter: (mi) => mi.user.id === i.user.id,
							time: 3 * 60_000,
							componentType: ComponentType.Button,
						}),
					);

					if (confirmErr || confirmData.customId === "cancel") {
						await Promise.all([
							ci.deleteReply(),
							mainMessage.edit({
								components: createSplitButtonRows(),
							}),
						]);
						return;
					}

					logger.info(
						{ details: split.getSplitDetails(), members: split.getMemberIds() },
						"Split ended",
					);

					collector.stop();

					await Promise.all([
						mainMessage.edit({
							embeds: [],
							files: [createSplitAttachment(split)],
						}),
						ci.deleteReply(),
						memberList.cleanup(),
					]);

					const { amountPerPerson } = split.getSplitDetails();
					await db
						.insert(lootSplitBalances)
						.values(
							split.getMemberList().map((member) => ({
								serverId: cache.id,
								memberId: member.id,
								balance: amountPerPerson,
							})),
						)
						.onConflictDoUpdate({
							target: [lootSplitBalances.serverId, lootSplitBalances.memberId],
							set: {
								balance: sql`${lootSplitBalances.balance} + ${amountPerPerson}`,
							},
						});

					break;
				}
			}
		} catch (error) {
			logger.error(
				{
					splitId: split.getId(),
					action: ci.customId,
					error: getErrorMessage(error),
				},
				"Split interaction error",
			);
		}
	});
}
