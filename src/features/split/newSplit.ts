import { until } from "@open-draft/until";
import {
	ActionRowBuilder,
	type ButtonInteraction,
	type ChatInputCommandInteraction,
	ComponentType,
	type ModalActionRowComponentBuilder,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";
import { Lootsplit } from "#src/features/split/lootsplit.ts";
import {
	createMemberListMsg,
	createSplitButtonRows,
	generateSplitDetailsEmbed,
} from "#src/features/split/split-ui.ts";
import { logger } from "#src/utils/logger.ts";
import { type GuildDetails, getErrorMessage } from "#src/utils/misc.ts";

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
		await data.reply({
			content: "Invalid tax rate provided, must be a number between 0 and 100",
			ephemeral: true,
		});
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
			"Invalid amount provided",
		);
		await data.reply({
			content: "Invalid amount provided",
			ephemeral: true,
		});
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
		await data.reply({
			content: "Invalid repair cost provided",
			ephemeral: true,
		});
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
	i: ButtonInteraction,
	split: Lootsplit,
): Promise<void> {
	throw new Error("Not implemented");
}

// TODO: figure out how to cleanup all messages and collectors

export async function createNewSplit(
	cid: string,
	i: ChatInputCommandInteraction,
	_cache: GuildDetails,
): Promise<void> {
	const split = new Lootsplit();

	const memberListMsg = createMemberListMsg(i, split.getMemberList());

	const mainMessage = await i.followUp({
		content: "",
		embeds: [generateSplitDetailsEmbed(split.getSplitDetails(), i.locale)],
		components: createSplitButtonRows(),
	});

	await memberListMsg.followUp();

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
					await handleAddMembers(ci, split);
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
