import assert from "node:assert";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	ComponentType,
	EmbedBuilder,
	GuildMember,
	InteractionContextType,
	ModalBuilder,
	SlashCommandBuilder,
	TextInputBuilder,
	TextInputStyle,
	UserSelectMenuBuilder,
	type ModalActionRowComponentBuilder,
	type Snowflake,
} from "discord.js";
import type { CommandHandler } from "#src/utils/command.js";
import {
	createGenericEmbed,
	guildCache,
	isAdminOrManager,
	type GuildDetails,
} from "#src/utils/misc.ts";
import { logger } from "#src/utils/logger.ts";
import { config } from "#src/utils/config.ts";
import { until } from "@open-draft/until";

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

async function createNewSplit(
	cid: string,
	i: ChatInputCommandInteraction,
	cache: GuildDetails,
): Promise<void> {
	let totalMembers = 0;
	let taxRate = 10;
	let totalSplit = 0;

	const embed = new EmbedBuilder()
		.setTitle("Split Details")
		.addFields(
			{
				name: "Total Members",
				value: totalMembers.toString(),
				inline: true,
			},
			{ name: "Tax", value: `${taxRate}%`, inline: true },
			{ name: " ", value: " ", inline: true },
			{ name: "Total Split", value: totalSplit.toString(), inline: true },
			{
				name: "Split Per Person",
				value:
					totalMembers !== 0
						? Math.floor(
								(totalSplit - totalSplit * (taxRate / 100)) / totalMembers,
							).toString()
						: "N/A",
				inline: true,
			},
			{ name: " ", value: " ", inline: true },
		)
		.setColor(config.colors.info);

	const addMembersBtn = new ButtonBuilder()
		.setCustomId("addMembers")
		.setLabel("Add Members")
		.setStyle(ButtonStyle.Primary);

	const removeMembersBtn = new ButtonBuilder()
		.setCustomId("removeMembers")
		.setLabel("Remove Members")
		.setStyle(ButtonStyle.Primary);

	const setTotalBtn = new ButtonBuilder()
		.setCustomId("setTotal")
		.setLabel("Set Total")
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

	// do I want a cache here?
	// update database
	// log initial lootsplit created

	const firstRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
		addMembersBtn,
		removeMembersBtn,
	);

	const secondRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
		setTotalBtn,
		setTaxBtn,
	);

	const thirdRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
		endSplitBtn,
		cancelSplitBtn,
	);

	const res = await i.followUp({
		content: "",
		embeds: [embed],
		components: [secondRow, firstRow, thirdRow],
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

				const taxInput = new TextInputBuilder()
					.setCustomId("taxInput")
					.setLabel("Tax Rate")
					.setValue(taxRate.toString())
					.setMinLength(1)
					.setMaxLength(3)
					.setRequired(true)
					.setStyle(TextInputStyle.Short);

				const row = new ActionRowBuilder<ModalActionRowComponentBuilder>();
				row.addComponents(taxInput);

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
				const defaultUsers: Snowflake[] = [ci.user.id];

				// FIXME: idk man
				if (!(ci.member instanceof GuildMember)) return;
				if (ci.member.voice.channel) {
					const ids = ci.member.voice.channel.members.keys();
				}

				const menu = new UserSelectMenuBuilder()
					.setCustomId(`whoCares`)
					.setPlaceholder("Select multiple users.")
					.setDefaultUsers(defaultUsers)
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
