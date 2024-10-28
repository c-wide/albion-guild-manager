import assert from "node:assert";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	ComponentType,
	EmbedBuilder,
	InteractionContextType,
	Locale,
	ModalBuilder,
	SlashCommandBuilder,
	TextInputBuilder,
	TextInputStyle,
	UserSelectMenuBuilder,
	type ModalActionRowComponentBuilder,
} from "discord.js";
import { until } from "@open-draft/until";
import type { CommandHandler } from "#src/utils/command.ts";
import {
	createGenericEmbed,
	guildCache,
	isAdminOrManager,
	type GuildDetails,
} from "#src/utils/misc.ts";
import { logger } from "#src/utils/logger.ts";
import { config } from "#src/utils/config.ts";

export const cooldown = 5;

export const builder = new SlashCommandBuilder()
	.setName("split")
	.setDescription("Manage loot splits and balances for your guild")
	.addSubcommand((subcommand) =>
		subcommand.setName("new").setDescription("Create a new loot split"),
	)
	.addSubcommandGroup((group) =>
		group
			.setName("balance")
			.setDescription("View and manage your personal balance")
			.addSubcommand((subcommand) =>
				subcommand.setName("view").setDescription("Check your current balance"),
			)
			.addSubcommand((subcommand) =>
				subcommand
					.setName("transfer")
					.setDescription("Transfer funds to another member")
					.addIntegerOption((option) =>
						option
							.setName("amount")
							.setDescription("Amount of funds to transfer")
							.setRequired(true)
							.setMinValue(1),
					)
					.addUserOption((option) =>
						option
							.setName("user")
							.setDescription("Member to transfer funds to")
							.setRequired(true),
					),
			),
	)
	.addSubcommandGroup((group) =>
		group
			.setName("admin")
			.setDescription("Administrative commands for managing member balances")
			.addSubcommand((subcommand) =>
				subcommand
					.setName("payout")
					.setDescription("Pay out funds to a member")
					.addIntegerOption((option) =>
						option
							.setName("amount")
							.setDescription("Amount of funds to pay out")
							.setRequired(true)
							.setMinValue(1),
					)
					.addUserOption((option) =>
						option
							.setName("user")
							.setDescription("Member to pay out funds to")
							.setRequired(true),
					),
			)
			.addSubcommand((subcommand) =>
				subcommand
					.setName("view_balance")
					.setDescription("View the balance of any member")
					.addUserOption((option) =>
						option
							.setName("user")
							.setDescription("Member whose balance to view")
							.setRequired(true),
					),
			)
			.addSubcommand((subcommand) =>
				subcommand
					.setName("set_balance")
					.setDescription("Manually set a member's balance")
					.addIntegerOption((option) =>
						option
							.setName("amount")
							.setDescription("New balance amount")
							.setRequired(true)
							.setMinValue(0),
					)
					.addUserOption((option) =>
						option
							.setName("user")
							.setDescription("Member whose balance to set")
							.setRequired(true),
					),
			),
	)
	.setContexts(InteractionContextType.Guild);

// TODO: fix ephemeral status
export const handler: CommandHandler = async ({ cid, i }) => {
	// Retreive cached guild
	const cachedGuild = guildCache.get(i.guildId ?? "");
	assert(cachedGuild, "Guild not found in cache");

	// Initial deferral to prevent timeouts
	await i.deferReply({ ephemeral: true });

	// Handle users managing their balances
	if (i.options.getSubcommandGroup() === "balance") {
		return;
	}

	// Only server admins or managers can use the other commands
	if (!isAdminOrManager(i.member, cachedGuild)) {
		logger.info({ cid }, "User lacks permission");
		await i.reply({
			content: "",
			ephemeral: true,
			embeds: [
				createGenericEmbed({
					title: " ",
					description: "You lack permission",
					color: config.colors.warning,
				}),
			],
		});
		return;
	}

	// Handle creating a new split
	if (i.options.getSubcommand() === "new") {
		await createNewSplit(cid, i, cachedGuild);
		return;
	}

	// Handle admin commands
	if (i.options.getSubcommandGroup() === "admin") {
		return;
	}
};

function calculateSplit(
	totalAmount: number,
	repairCost: number,
	taxRate: number,
	memberCount: number,
): { buyerPayment: number; amountPerPerson: number } {
	if (memberCount === 0) return { buyerPayment: 0, amountPerPerson: 0 };

	const afterRepairs = totalAmount - repairCost;
	const buyerProfit = afterRepairs * (taxRate / 100);
	const buyerPayment = Math.floor(afterRepairs - buyerProfit);
	const amountPerPerson = Math.floor(buyerPayment / memberCount);

	return { buyerPayment, amountPerPerson };
}

function generateSplitDetailsEmbed(
	totalAmount: number,
	repairCost: number,
	taxRate: number,
	memberCount: number,
	lng: Locale,
): EmbedBuilder {
	const { format: i18nNum } = Intl.NumberFormat(lng);

	const { buyerPayment, amountPerPerson } = calculateSplit(
		totalAmount,
		repairCost,
		taxRate,
		memberCount,
	);

	// TODO: i18n tax?

	return new EmbedBuilder()
		.setTitle("Split Details")
		.addFields(
			{ name: "Total Amount", value: i18nNum(totalAmount), inline: true },
			{ name: "Repair Cost", value: i18nNum(repairCost), inline: true },
			{ name: "Tax", value: `${taxRate}%`, inline: true },
			{
				name: "Member Count",
				value: i18nNum(memberCount),
				inline: true,
			},
			{
				name: "Buyer Payment",
				value: i18nNum(buyerPayment),
				inline: true,
			},

			{
				name: "Amount Per Person",
				value: i18nNum(amountPerPerson),
				inline: true,
			},
		)
		.setColor(config.colors.info);
}

function createButtonRows(): {
	calcRow: ActionRowBuilder<ButtonBuilder>;
	membersRow: ActionRowBuilder<ButtonBuilder>;
	actionsRow: ActionRowBuilder<ButtonBuilder>;
} {
	const addMembersBtn = new ButtonBuilder()
		.setCustomId("addMembers")
		.setLabel("Add Members")
		.setStyle(ButtonStyle.Primary);

	const removeMembersBtn = new ButtonBuilder()
		.setCustomId("removeMembers")
		.setLabel("Remove Members")
		.setStyle(ButtonStyle.Primary);

	const addFromVoiceBtn = new ButtonBuilder()
		.setCustomId("addVoiceMembers")
		.setLabel("Add From Voice")
		.setStyle(ButtonStyle.Primary);

	const setTotalBtn = new ButtonBuilder()
		.setCustomId("setTotalAmount")
		.setLabel("Set Total Amount")
		.setStyle(ButtonStyle.Primary);

	const setRepairCostBtn = new ButtonBuilder()
		.setCustomId("setRepairCost")
		.setLabel("Set Repair Cost")
		.setStyle(ButtonStyle.Primary);

	const setTaxBtn = new ButtonBuilder()
		.setCustomId("setTax")
		.setLabel("Set Tax")
		.setStyle(ButtonStyle.Primary);

	const endSplitBtn = new ButtonBuilder()
		.setCustomId("endSplit")
		.setLabel("End Split")
		.setStyle(ButtonStyle.Secondary);

	const cancelSplitBtn = new ButtonBuilder()
		.setCustomId("cancelSplit")
		.setLabel("Cancel")
		.setStyle(ButtonStyle.Danger);

	const calcRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
		setTotalBtn,
		setRepairCostBtn,
		setTaxBtn,
	);

	const membersRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
		addMembersBtn,
		removeMembersBtn,
		addFromVoiceBtn,
	);

	const actionsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
		endSplitBtn,
		cancelSplitBtn,
	);

	return { calcRow, membersRow, actionsRow };
}

async function createNewSplit(
	cid: string,
	i: ChatInputCommandInteraction,
	cache: GuildDetails,
): Promise<void> {
	let totalAmount = 352876349;
	let repairCost = 34387645;
	let taxRate = 10;
	let memberCount = 84;

	const embed = generateSplitDetailsEmbed(
		totalAmount,
		repairCost,
		taxRate,
		memberCount,
		i.locale,
	);

	const { calcRow, membersRow, actionsRow } = createButtonRows();

	// do I want a cache here?
	// update database
	// log initial lootsplit created

	const res = await i.followUp({
		content: "",
		embeds: [embed],
		components: [calcRow, membersRow, actionsRow],
	});

	const collector = res.createMessageComponentCollector({
		filter: (mi) => mi.user.id === i.user.id,
		componentType: ComponentType.Button,
		time: 3_600_000,
	});

	collector.on("collect", async (ci) => {
		switch (ci.customId) {
			case "setTax":
				const modal = new ModalBuilder()
					.setCustomId(`taxRate-${ci.id}`)
					.setTitle("Set Tax");

				const input = new TextInputBuilder()
					.setCustomId("taxInput")
					.setLabel("Tax Rate")
					.setValue(taxRate.toString())
					.setMinLength(1)
					.setMaxLength(3)
					.setRequired(true)
					.setStyle(TextInputStyle.Short);

				const row = new ActionRowBuilder<ModalActionRowComponentBuilder>();

				row.addComponents(input);
				modal.addComponents(row);

				await ci.showModal(modal);

				const { error, data } = await until(() =>
					ci.awaitModalSubmit({
						filter: (mi) => mi.customId === `taxRate-${ci.id}`,
						time: 60_000,
					}),
				);

				if (error) return;

				// Typescript non-sense
				if (!data.isFromMessage()) return;

				const newRate = data.fields.getTextInputValue("taxInput");

				// TODO: check if it's actually a number
				// TODO: update value
				// TODO: regen embed

				break;
			case "addMembers":
				// TODO: present select menu
				// TODO: confirm / cancel buttons

				const menu = new UserSelectMenuBuilder()
					.setCustomId(`whoCares`)
					.setPlaceholder("Select multiple users.")
					.setMinValues(1)
					.setMaxValues(10);

				const row1 =
					new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(menu);

				await ci.reply({
					content: "Select users:",
					components: [row1],
				});

				break;
			case "cancelSplit":
				collector.stop();
				// TODO: delete all related messages
				await i.deleteReply();
				break;
		}
	});
}
