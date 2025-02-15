import assert from "node:assert";
import {
	ChannelType,
	InteractionContextType,
	MessageFlags,
	SlashCommandBuilder,
} from "discord.js";
import { handleAdminActions } from "#src/features/split/admin.ts";
import { handleBalanceActions } from "#src/features/split/balance.ts";
import { createNewSplit } from "#src/features/split/newSplit.ts";
import type { CommandHandler } from "#src/utils/command.ts";
import { config } from "#src/utils/config.ts";
import { logger } from "#src/utils/logger.ts";
import {
	Settings,
	createGenericEmbed,
	guildCache,
	isAdminOrManager,
} from "#src/utils/misc.ts";

// TODO: handle shard/bot restarts
// TODO: move log channel check into its own function
// TODO: log manager / audit log channel changes
// TODO: i18n

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
			)
			.addSubcommand((subcommand) =>
				subcommand
					.setName("set_manager_role")
					.setDescription("Set the role that can manage splits")
					.addRoleOption((option) =>
						option
							.setName("role")
							.setDescription("Role that can manage splits")
							.setRequired(true),
					),
			)
			.addSubcommand((subcommand) =>
				subcommand
					.setName("set_audit_log_channel")
					.setDescription("Set the channel to log split command actions to")
					.addChannelOption((option) =>
						option
							.setName("channel")
							.setDescription("Channel to log balance changes")
							.addChannelTypes(ChannelType.GuildText)
							.setRequired(true),
					),
			)
			.addSubcommand((subcommand) =>
				subcommand
					.setName("export")
					.setDescription("Export all balance data for the guild")
					.addStringOption((option) =>
						option
							.setName("format")
							.setDescription("The format to export the data in")
							.addChoices([
								{
									name: "CSV",
									value: "CSV",
								},
								{
									name: "JSON",
									value: "JSON",
								},
								{
									name: "XLSX",
									value: "XLSX",
								},
							])
							.setRequired(true),
					),
			)
			.addSubcommand((subcommand) =>
				subcommand.setName("reset").setDescription("Reset all balances"),
			),
	)
	.setContexts(InteractionContextType.Guild);

export const handler: CommandHandler = async ({ cid, i }) => {
	// Retreive cached guild
	const cachedGuild = guildCache.get(i.guildId ?? "");
	assert(cachedGuild, "Guild not found in cache");

	// Handle users managing their balances
	if (i.options.getSubcommandGroup() === "balance") {
		await i.deferReply({ flags: MessageFlags.Ephemeral });
		await handleBalanceActions(cid, i, cachedGuild);
		return;
	}

	// Extract manager role from guild settings
	const managerRole = cachedGuild.settings.get(Settings.SplitManagerRole) as
		| string
		| null;

	// Check if user has permission to create / manage splits
	if (
		!isAdminOrManager(i.member, cachedGuild) &&
		(!managerRole || !i.member.roles.cache.has(managerRole))
	) {
		logger.info({ cid }, "User lacks permission to manage splits");
		await i.reply({
			content: "",
			embeds: [
				createGenericEmbed({
					title: " ",
					description: "You do not have permission to manage splits",
					color: config.colors.warning,
				}),
			],
			flags: MessageFlags.Ephemeral,
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
		await i.deferReply({ flags: MessageFlags.Ephemeral });
		await handleAdminActions(cid, i, cachedGuild);
		return;
	}
};
