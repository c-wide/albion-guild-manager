import {
	ActionRowBuilder,
	AttachmentBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	type EmbedField,
	type Locale,
} from "discord.js";
import type { Lootsplit, SplitDetails } from "#src/features/split/lootsplit.ts";
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

export function generateMemberListFields(memberList: string[]): EmbedField[] {
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

export function generateMemberListEmbeds(memberList: string[]): EmbedBuilder[] {
	const memberListFields = generateMemberListFields(memberList);
	const embeds: EmbedBuilder[] = [];

	for (let i = 0; i < memberListFields.length; i += 3) {
		const embedFields = memberListFields.slice(i, i + 3);
		const embed = new EmbedBuilder()
			.setTitle("Member List")
			.addFields(embedFields)
			.setColor(config.colors.info);

		embeds.push(embed);
	}

	return embeds;
}

function formatDate(date: Date): string {
	return date.toISOString().replace("T", " ").split(".")[0];
}

export function createSplitAttachment(split: Lootsplit): AttachmentBuilder {
	const details = split.getSplitDetails();
	const memberList = split.getMemberList();

	const summaryLines = [
		"=== LOOT SPLIT SUMMARY ===",
		`Split ID: ${details.id}`,
		`Created By: ${details.createdBy.id} ${details.createdBy.name}`,
		`Created At: ${formatDate(details.createdAt)} UTC`,
		`Ended At: ${formatDate(new Date())} UTC`,
		"",
		"=== SPLIT DETAILS ===",
		`Total Amount: ${details.totalAmount}`,
		`Repair Cost: ${details.repairCost}`,
		`Tax Rate: ${details.taxRate}%`,
		`Number of Members: ${details.memberCount}`,
		`Buyer Payment: ${details.buyerPayment}`,
		`Split Per Person: ${details.amountPerPerson}`,
		"",
		"=== MEMBER LIST ===",
		"ID Name",
	];

	const memberRows = memberList.map((member) => `${member.id} ${member.name}`);

	const fileContent = [
		...summaryLines,
		...memberRows,
		"",
		"=== END OF SPLIT SUMMARY ===",
	].join("\n");

	const buffer = Buffer.from(fileContent, "utf-8");

	const attachment = new AttachmentBuilder(buffer, {
		name: `split_${split.getId()}.txt`,
	});

	return attachment;
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
