import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	type ChatInputCommandInteraction,
	EmbedBuilder,
	type EmbedField,
	type Locale,
	type Snowflake,
} from "discord.js";
import { Pagination } from "pagination.djs";
import type { SplitDetails } from "#src/features/split/lootsplit.ts";
import { config } from "#src/utils/config.ts";

export function generateSplitDetailsEmbed(
	splitDetails: SplitDetails,
	locale: Locale,
): EmbedBuilder {
	const { format: i18nNum } = Intl.NumberFormat(locale);
	const { format: i18nPercent } = Intl.NumberFormat(locale, {
		style: "percent",
		maximumFractionDigits: 0,
	});

	return new EmbedBuilder()
		.setTitle("Split Details")
		.addFields(
			{
				name: "Total Amount",
				value: i18nNum(splitDetails.totalAmount),
				inline: true,
			},
			{
				name: "Repair Cost",
				value: i18nNum(splitDetails.repairCost),
				inline: true,
			},
			{
				name: "Tax",
				value: i18nPercent(splitDetails.taxRate / 100),
				inline: true,
			},
			{
				name: "Member Count",
				value: i18nNum(splitDetails.memberCount),
				inline: true,
			},
			{
				name: "Buyer Payment",
				value: i18nNum(splitDetails.buyerPayment),
				inline: true,
			},
			{
				name: "Amount Per Person",
				value: i18nNum(splitDetails.amountPerPerson),
				inline: true,
			},
		)
		.setColor(config.colors.info);
}

export function generateMemberListFields(
	memberList: Snowflake[],
): EmbedField[] {
	if (memberList.length === 0) {
		return [{ name: " ", value: "No members found", inline: true }];
	}

	return memberList.reduce<EmbedField[]>((accumulator, snowflake, index) => {
		const fieldIndex = Math.floor(index / 10);

		if (accumulator.length <= fieldIndex) {
			accumulator.push({
				name: " ",
				value: `<@${snowflake}>`,
				inline: true,
			});
			return accumulator;
		}

		accumulator[fieldIndex].value += `\n<@${snowflake}>`;
		return accumulator;
	}, []);
}

export function createMemberListMsg(
	i: ChatInputCommandInteraction,
	memberList: Snowflake[],
): Pagination {
	const pagination = new Pagination(i, { limit: 2, idle: 3_600_000 });
	pagination.setTitle("Member List");
	pagination.setColor(config.colors.info);
	pagination.setFields(generateMemberListFields(memberList));
	pagination.paginateFields();
	return pagination;
}

export function createSplitButtonRows(): ActionRowBuilder<ButtonBuilder>[] {
	const calcRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setCustomId("setTotalAmount")
			.setLabel("Set Total Amount")
			.setStyle(ButtonStyle.Primary),
		new ButtonBuilder()
			.setCustomId("setRepairCost")
			.setLabel("Set Repair Cost")
			.setStyle(ButtonStyle.Primary),
		new ButtonBuilder()
			.setCustomId("setTax")
			.setLabel("Set Tax")
			.setStyle(ButtonStyle.Primary),
	);

	const membersRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setCustomId("addMembers")
			.setLabel("Add Members")
			.setStyle(ButtonStyle.Primary),
		new ButtonBuilder()
			.setCustomId("removeMembers")
			.setLabel("Remove Members")
			.setStyle(ButtonStyle.Primary),
		new ButtonBuilder()
			.setCustomId("addVoiceMembers")
			.setLabel("Add From Voice")
			.setStyle(ButtonStyle.Primary),
	);

	const actionsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setCustomId("endSplit")
			.setLabel("End Split")
			.setStyle(ButtonStyle.Secondary),
		new ButtonBuilder()
			.setCustomId("cancelSplit")
			.setLabel("Cancel")
			.setStyle(ButtonStyle.Danger),
	);

	return [calcRow, membersRow, actionsRow];
}
