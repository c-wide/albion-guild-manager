import assert from "node:assert";
import { InteractionContextType, SlashCommandBuilder } from "discord.js";
import type { CommandHandler } from "#src/utils/command.ts";
import { config } from "#src/utils/config.ts";
import { logger } from "#src/utils/logger.ts";
import {
	createGenericEmbed,
	guildCache,
	isAdminOrManager,
} from "#src/utils/misc.ts";
import { createNewSplit } from "#src/features/split/newSplit.ts";

export const cooldown = 5;

// TODO: add role command for ppl that can manage splits?

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

export const handler: CommandHandler = async ({ cid, i }) => {
	// Retreive cached guild
	const cachedGuild = guildCache.get(i.guildId ?? "");
	assert(cachedGuild, "Guild not found in cache");

	// Handle users managing their balances
	if (i.options.getSubcommandGroup() === "balance") {
		await i.deferReply({ ephemeral: true });
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
		await i.deferReply();
		await createNewSplit(cid, i, cachedGuild);
		return;
	}

	// Handle admin commands
	if (i.options.getSubcommandGroup() === "admin") {
		await i.deferReply({ ephemeral: true });
		return;
	}
};
