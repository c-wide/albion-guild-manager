import { until } from "@open-draft/until";
import {
	ActionRowBuilder,
	ButtonBuilder,
	type ButtonInteraction,
	ButtonStyle,
	type ChatInputCommandInteraction,
	ComponentType,
	EmbedBuilder,
	type InteractionCollector,
	type Message,
	type ModalActionRowComponentBuilder,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	UserSelectMenuBuilder,
} from "discord.js";
import { sql } from "drizzle-orm";
import { db } from "#src/database/db.ts";
import { lootSplitBalances } from "#src/database/schema.ts";
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

async function handleSetTax(
	i: ButtonInteraction,
	split: Lootsplit,
): Promise<void> {
	// Create a modal dialog for setting the tax rate
	const modal = new ModalBuilder()
		.setCustomId(`taxRate-${i.id}`)
		.setTitle("Set Tax");

	// Create a text input field for the tax rate
	const input = new TextInputBuilder()
		.setCustomId("taxInput")
		.setLabel("Tax Rate")
		.setPlaceholder(split.getTaxRate().toString())
		.setMinLength(1)
		.setMaxLength(3)
		.setRequired(true)
		.setStyle(TextInputStyle.Short);

	// Create an action row and add the text input to it
	const row = new ActionRowBuilder<ModalActionRowComponentBuilder>();
	row.addComponents(input);

	// Add the action row to the modal
	modal.addComponents(row);

	// Show the modal to the user
	await i.showModal(modal);

	// Wait for the user to submit the modal
	const { error, data } = await until(() =>
		i.awaitModalSubmit({
			filter: (mi) => mi.customId === `taxRate-${i.id}`,
			time: 60_000,
		}),
	);

	// If there was an error or the data is not from a message, return early
	if (error) return;
	if (!data.isFromMessage()) return;

	// Get the tax rate from the submitted data and set it on the split
	const taxRate = Number(data.fields.getTextInputValue("taxInput"));
	const success = split.setTaxRate(taxRate);

	// If setting the tax rate was not successful, log the error and inform the user
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

	// Log the successful setting of the tax rate
	logger.info({ splitId: split.getId(), taxRate }, "Tax rate set successfully");

	// Update the message with the new split details
	await data.update({
		embeds: [generateSplitDetailsEmbed(split.getSplitDetails(), i.locale)],
	});
}

async function handleSetTotalAmount(
	i: ButtonInteraction,
	split: Lootsplit,
): Promise<void> {
	// Create a modal dialog for setting the total amount
	const modal = new ModalBuilder()
		.setCustomId(`totalAmount-${i.id}`)
		.setTitle("Set Total Amount");

	// Create a text input field for the total amount
	const input = new TextInputBuilder()
		.setCustomId("amountInput")
		.setLabel("Total Amount")
		.setPlaceholder(split.getTotalAmount().toString())
		.setMinLength(1)
		.setMaxLength(15)
		.setRequired(true)
		.setStyle(TextInputStyle.Short);

	// Create an action row and add the text input to it
	const row = new ActionRowBuilder<ModalActionRowComponentBuilder>();
	row.addComponents(input);

	// Add the action row to the modal
	modal.addComponents(row);

	// Show the modal to the user
	await i.showModal(modal);

	// Wait for the user to submit the modal
	const { error, data } = await until(() =>
		i.awaitModalSubmit({
			filter: (mi) => mi.customId === `totalAmount-${i.id}`,
			time: 60_000,
		}),
	);

	// If there was an error or the data is not from a message, return early
	if (error) return;
	if (!data.isFromMessage()) return;

	// Get the total amount from the submitted data and set it on the split
	const totalAmount = Number(data.fields.getTextInputValue("amountInput"));
	const success = split.setTotalAmount(totalAmount);

	// If setting the total amount was not successful, log the error and inform the user
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

	// Log the successful setting of the total amount
	logger.info(
		{ splitId: split.getId(), totalAmount },
		"Total amount set successfully",
	);

	// Update the message with the new split details
	await data.update({
		embeds: [generateSplitDetailsEmbed(split.getSplitDetails(), i.locale)],
	});
}

async function handleSetRepairCost(
	i: ButtonInteraction,
	split: Lootsplit,
): Promise<void> {
	// Create a modal dialog for setting the repair cost
	const modal = new ModalBuilder()
		.setCustomId(`repairCost-${i.id}`)
		.setTitle("Set Repair Cost");

	// Create a text input field for the repair cost
	const input = new TextInputBuilder()
		.setCustomId("repairCostInput")
		.setLabel("Repair Cost")
		.setPlaceholder(split.getRepairCost().toString())
		.setMinLength(1)
		.setMaxLength(15)
		.setRequired(true)
		.setStyle(TextInputStyle.Short);

	// Create an action row and add the text input to it
	const row = new ActionRowBuilder<ModalActionRowComponentBuilder>();
	row.addComponents(input);

	// Add the action row to the modal
	modal.addComponents(row);

	// Show the modal to the user
	await i.showModal(modal);

	// Wait for the user to submit the modal
	const { error, data } = await until(() =>
		i.awaitModalSubmit({
			filter: (mi) => mi.customId === `repairCost-${i.id}`,
			time: 60_000,
		}),
	);

	// If there was an error or the data is not from a message, return early
	if (error) return;
	if (!data.isFromMessage()) return;

	// Get the repair cost from the submitted data and set it on the split
	const repairCost = Number(data.fields.getTextInputValue("repairCostInput"));
	const success = split.setRepairCost(repairCost);

	// If setting the repair cost was not successful, log the error and inform the user
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

	// Log the successful setting of the repair cost
	logger.info(
		{ splitId: split.getId(), repairCost },
		"Repair cost set successfully",
	);

	// Update the message with the new split details
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
	// Create a user select menu for adding members
	const selectRow = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
		new UserSelectMenuBuilder()
			.setCustomId("addMembers")
			.setPlaceholder("Select up to 25 members")
			.setMinValues(1)
			.setMaxValues(25),
	);

	// Send a message with the user select menu
	const selectMsg = await i.reply({
		content: "Select the members you want to add to the split",
		components: [selectRow],
		ephemeral: true,
		fetchReply: true,
	});

	// Wait for the user to select members
	const { error: selectErr, data: selectData } = await until(() =>
		selectMsg.awaitMessageComponent({
			filter: (mi) => mi.user.id === i.user.id,
			time: 5 * 60_000,
			componentType: ComponentType.UserSelect,
		}),
	);

	// If there was an error or timeout, delete the select message and return early
	if (selectErr) {
		await selectMsg.delete();
		return;
	}

	// Create an embed to confirm the selected members
	const confirmEmbed = new EmbedBuilder()
		.setTitle("Confirm Members")
		.setDescription("Are you sure you want to add these members?")
		.setFields(generateMemberListFields(selectData.values))
		.setColor(config.colors.info);

	// Create buttons for confirming or canceling the member addition
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
	const confirmMsg = await selectData.update({
		content: "",
		embeds: [confirmEmbed],
		components: [confirmRow],
	});

	// Wait for the user to confirm or cancel
	const { error: confirmErr, data: confirmData } = await until(() =>
		confirmMsg.awaitMessageComponent({
			filter: (mi) => mi.user.id === i.user.id,
			time: 5 * 60_000,
			componentType: ComponentType.Button,
		}),
	);

	// If there was an error or timeout, delete the confirmation message and return early
	if (confirmErr) {
		await confirmMsg.delete();
		return;
	}

	// If the user canceled, delete the confirmation message and return early
	if (confirmData.customId === "cancel") {
		await confirmMsg.delete();
		return;
	}

	// Add the selected members to the split
	const members = selectData.members.map((member) => ({
		id: member.user.id,
		name: member.displayName,
	}));
	split.addMembers(members);

	// Log the addition of members to the split
	logger.info({ splitId: split.getId(), members }, "Members added to split");

	// Update the main message and member list with the new split details
	await Promise.allSettled([
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
	// Create a user select menu for removing members
	const selectRow = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
		new UserSelectMenuBuilder()
			.setCustomId("removeMembers")
			.setPlaceholder("Select up to 25 members")
			.setMinValues(1)
			.setMaxValues(25),
	);

	// Send a message with the user select menu
	const selectMsg = await i.reply({
		content: "Select the members you want to remove from the split",
		components: [selectRow],
		ephemeral: true,
		fetchReply: true,
	});

	// Wait for the user to select members
	const { error: selectErr, data: selectData } = await until(() =>
		selectMsg.awaitMessageComponent({
			filter: (mi) => mi.user.id === i.user.id,
			time: 5 * 60_000,
			componentType: ComponentType.UserSelect,
		}),
	);

	// If there was an error or timeout, delete the select message and return early
	if (selectErr) {
		await selectMsg.delete();
		return;
	}

	// Create an embed to confirm the selected members
	const confirmEmbed = new EmbedBuilder()
		.setTitle("Confirm Members")
		.setDescription("Are you sure you want to remove these members?")
		.setFields(generateMemberListFields(selectData.values))
		.setColor(config.colors.info);

	// Create buttons for confirming or canceling the member removal
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
	const confirmMsg = await selectData.update({
		content: "",
		embeds: [confirmEmbed],
		components: [confirmRow],
	});

	// Wait for the user to confirm or cancel
	const { error: confirmErr, data: confirmData } = await until(() =>
		confirmMsg.awaitMessageComponent({
			filter: (mi) => mi.user.id === i.user.id,
			time: 5 * 60_000,
			componentType: ComponentType.Button,
		}),
	);

	// If there was an error or timeout, delete the confirmation message and return early
	if (confirmErr) {
		await confirmMsg.delete();
		return;
	}

	// If the user canceled, delete the confirmation message and return early
	if (confirmData.customId === "cancel") {
		await confirmMsg.delete();
		return;
	}

	// Remove the selected members from the split
	const members = selectData.members.map((member) => ({
		id: member.user.id,
		name: member.displayName,
	}));
	split.removeMembers(members);

	// Log the removal of members from the split
	logger.info(
		{ splitId: split.getId(), members },
		"Members removed from split",
	);

	// Update the main message and member list with the new split details
	await Promise.allSettled([
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
	// Get the voice channel the user is in
	const voiceChannel = i.member.voice.channel;
	if (!voiceChannel) {
		// If the user is not in a voice channel, send an ephemeral message and return
		const res = await i.reply({
			content: "You must be in a voice channel to use this feature",
			ephemeral: true,
		});
		setTimeout(async () => await res.delete(), 10_000);
		return;
	}

	// Map the members in the voice channel to an array of objects with id and name
	const members = voiceChannel.members.map((member) => ({
		id: member.user.id,
		name: member.displayName,
	}));

	// Create an embed to confirm the selected members
	const confirmEmbed = new EmbedBuilder()
		.setTitle("Confirm Members")
		.setDescription(
			`Are you sure you want to add ${members.length} members to the split?`,
		)
		.setColor(config.colors.info);

	// Create buttons for confirming or canceling the member addition
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
	const confirmMsg = await i.reply({
		content: "",
		embeds: [confirmEmbed],
		components: [confirmRow],
		ephemeral: true,
		fetchReply: true,
	});

	// Wait for the user to confirm or cancel
	const { error: confirmErr, data: confirmData } = await until(() =>
		confirmMsg.awaitMessageComponent({
			filter: (mi) => mi.user.id === i.user.id,
			time: 5 * 60_000,
			componentType: ComponentType.Button,
		}),
	);

	// If there was an error or timeout, delete the reply and return early
	if (confirmErr) {
		await i.deleteReply();
		return;
	}

	// If the user canceled, delete the reply and return early
	if (confirmData.customId === "cancel") {
		await i.deleteReply();
		return;
	}

	// Add the selected members to the split
	split.addMembers(members);

	// Log the addition of members to the split
	logger.info(
		{ splitId: split.getId(), members },
		"Members added to split from voice channel",
	);

	// Update the main message and member list with the new split details
	await Promise.allSettled([
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
	// Stop the collector and cleanup the main message and member list
	collector.stop();
	await Promise.allSettled([mainMessage.delete(), memberList.cleanup()]);
	logger.info({ splitId: split.getId() }, "Split cancelled");
}

async function saveSplit(cache: GuildDetails, split: Lootsplit): Promise<void> {
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
}

async function handleEndSplit(
	i: ButtonInteraction<"cached">,
	split: Lootsplit,
	cache: GuildDetails,
	mainMessage: Message,
	memberList: PaginationEmbed,
	collector: InteractionCollector<ButtonInteraction<"cached">>,
): Promise<void> {
	// Check if the total amount is set
	if (split.getTotalAmount() < 1) {
		await i.reply({
			content: "You must set a total amount before ending the split",
			ephemeral: true,
		});
		setTimeout(async () => await i.deleteReply(), 10_000);
		return;
	}

	// Check if there is at least one member in the split
	if (split.getMemberCount() < 1) {
		await i.reply({
			content: "You must have at least one member in the split to end it",
			ephemeral: true,
		});
		setTimeout(async () => await i.deleteReply(), 10_000);
		return;
	}

	// Remove components from the main message
	await mainMessage.edit({
		components: [],
	});

	// Create buttons for confirming or canceling the split ending
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
	const confirmMsg = await i.reply({
		content: "",
		embeds: [
			createGenericEmbed({
				title: "Confirmation",
				description: "Are you sure you want to end the split?",
				color: config.colors.info,
			}),
		],
		components: [confirmRow],
		ephemeral: true,
		fetchReply: true,
	});

	// Wait for the user to confirm or cancel
	const { error: confirmErr, data: confirmData } = await until(() =>
		confirmMsg.awaitMessageComponent({
			filter: (mi) => mi.user.id === i.user.id,
			time: 3 * 60_000,
			componentType: ComponentType.Button,
		}),
	);

	// If there was an error or the user canceled, restore the main message components and return
	if (confirmErr || confirmData.customId === "cancel") {
		await Promise.allSettled([
			i.deleteReply(),
			mainMessage.edit({
				components: createSplitButtonRows(),
			}),
		]);
		return;
	}

	// Log the split ending
	logger.info(
		{ details: split.getSplitDetails(), members: split.getMemberIds() },
		"Split ended",
	);

	// Stop the interaction collector
	collector.stop();

	// Update the main message, delete the reply, and clean up the member list
	await Promise.allSettled([
		mainMessage.edit({
			embeds: [],
			files: [createSplitAttachment(split)],
		}),
		i.deleteReply(),
		memberList.cleanup(),
	]);

	// Save the split and handle any errors
	const { error: saveErr } = await until(() => saveSplit(cache, split));
	if (saveErr) {
		logger.error(
			{
				splitId: split.getId(),
				error: getErrorMessage(saveErr),
			},
			"Unable to save split",
		);

		// If there was an error saving the split, send a follow-up message
		await i.followUp({
			embeds: [
				createGenericEmbed({
					title: "Something went wrong",
					description: "We were unable to save the split, please try again...",
					color: config.colors.error,
				}),
			],
		});
	}
}

export async function createNewSplit(
	cid: string,
	i: ChatInputCommandInteraction<"cached">,
	cache: GuildDetails,
): Promise<void> {
	// Create a new Lootsplit instance with the user's ID and display name
	const split = new Lootsplit({ id: i.user.id, name: i.member.displayName });

	// Create a new member list pagination embed
	const memberList = new PaginationEmbed(
		generateMemberListEmbeds(split.getMemberIds()),
		{
			collectorTimeout: 3_600_000,
		},
	);

	// Send the main message with the split details and member list
	const mainMessage = await i.followUp({
		content: "",
		embeds: [generateSplitDetailsEmbed(split.getSplitDetails(), i.locale)],
		components: createSplitButtonRows(),
	});
	await memberList.followUp(i);

	// Create an interaction collector for the main message
	const collector = mainMessage.createMessageComponentCollector({
		filter: (mi) => mi.user.id === i.user.id,
		componentType: ComponentType.Button,
		time: 3_600_000,
	});

	// Log the creation of the new split
	logger.info({ cid, splitId: split.getId() }, "New split created");

	// Handle interactions with the main message
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
					await handleEndSplit(
						ci,
						split,
						cache,
						mainMessage,
						memberList,
						collector,
					);
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
