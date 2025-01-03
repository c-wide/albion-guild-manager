import assert from "node:assert";
import { until } from "@open-draft/until";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	type ChatInputCommandInteraction,
	ComponentType,
	InteractionContextType,
	MessageFlags,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from "discord.js";
import { db } from "#src/database/db.ts";
import { serverSettings } from "#src/database/schema.ts";
import type { CommandHandler } from "#src/utils/command.ts";
import { config } from "#src/utils/config.ts";
import i18n from "#src/utils/i18n.ts";
import { logger } from "#src/utils/logger.ts";
import {
	type GuildDetails,
	Settings,
	createGenericEmbed,
	guildCache,
} from "#src/utils/misc.ts";

export const cooldown = 5;

export const builder = new SlashCommandBuilder()
	.setName(i18n.t("managers.name", { ns: "commands", lng: "en" }))
	.setDescription(i18n.t("managers.desc", { ns: "commands", lng: "en" }))
	.addSubcommand((subcommand) =>
		subcommand
			.setName(
				i18n.t("managers.subcommands.setRole.name", {
					ns: "commands",
					lng: "en",
				}),
			)
			.setDescription(
				i18n.t("managers.subcommands.setRole.desc", {
					ns: "commands",
					lng: "en",
				}),
			)
			.addRoleOption((option) =>
				option
					.setName(
						i18n.t("managers.subcommands.setRole.options.role.name", {
							ns: "commands",
							lng: "en",
						}),
					)
					.setDescription(
						i18n.t("managers.subcommands.setRole.options.role.desc", {
							ns: "commands",
							lng: "en",
						}),
					)
					.setRequired(true),
			),
	)
	.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
	.setContexts(InteractionContextType.Guild);

async function setManagerRole(
	cid: string,
	i: ChatInputCommandInteraction<"cached">,
	cache: GuildDetails,
): Promise<void> {
	// Extract the new role
	const newRole = i.options.getRole("role", true);

	// Create buttons for confirming or canceling
	const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setCustomId("confirm")
			.setLabel(i18n.t("phrases.confirm", { ns: "common", lng: i.locale }))
			.setStyle(ButtonStyle.Primary),
		new ButtonBuilder()
			.setCustomId("cancel")
			.setLabel(i18n.t("phrases.cancel", { ns: "common", lng: i.locale }))
			.setStyle(ButtonStyle.Danger),
	);

	// Send a message with the confirmation embed and buttons
	const confirmMsg = await i.followUp({
		content: "",
		embeds: [
			createGenericEmbed({
				title: " ",
				description: i18n.t("managers.responses.confirmSetRole", {
					roleId: newRole.id,
					ns: "commands",
					lng: i.locale,
				}),
				color: config.colors.info,
			}),
		],
		components: [confirmRow],
	});

	// Wait for the user to confirm or cancel
	const { error: confirmErr, data: confirmData } = await until(() =>
		confirmMsg.awaitMessageComponent({
			filter: (mi) => mi.user.id === i.user.id,
			time: 3 * 60_000,
			componentType: ComponentType.Button,
		}),
	);

	// If there was an error or timeout, delete the confirmation message and return early
	if (confirmErr) {
		await i.deleteReply();
		return;
	}

	// Defer the update to the confirmation message
	await confirmData.deferUpdate();

	// If the user canceled, delete the confirmation message and return early
	if (confirmData.customId === "cancel") {
		await confirmData.deleteReply();
		return;
	}

	// Update db
	await db
		.insert(serverSettings)
		.values({
			serverId: cache.id,
			key: Settings.ManagerRole,
			value: `snowflake_${newRole.id}`,
		})
		.onConflictDoUpdate({
			target: [serverSettings.serverId, serverSettings.key],
			set: {
				value: `snowflake_${newRole.id}`,
				updatedAt: new Date(),
			},
		});

	// Update cache
	cache.settings.set(Settings.ManagerRole, newRole.id);

	// Log things
	logger.info({ cid, roleId: newRole.id }, "Manager role updated");

	// If nothing went wrong, let the user know their operation was successful
	await confirmData.editReply({
		content: "",
		embeds: [
			createGenericEmbed({
				title: " ",
				description: i18n.t("managers.responses.setRole", {
					roleId: newRole.id,
					ns: "commands",
					lng: i.locale,
				}),
				color: config.colors.success,
			}),
		],
		components: [],
	});
}

export const handler: CommandHandler = async ({ cid, i }) => {
	// Retreive cached guild
	const cachedGuild = guildCache.get(i.guildId);
	assert(cachedGuild, "Guild not found in cache");

	// Only users with ManageGuild permission can set manager role
	if (i.memberPermissions.has(PermissionFlagsBits.ManageGuild) === false) {
		logger.info({ cid }, "User lacks permission");
		await i.reply({
			content: "",
			embeds: [
				createGenericEmbed({
					title: " ",
					description: i18n.t("managers.responses.noPermission", {
						ns: "commands",
						lng: i.locale,
					}),
					color: config.colors.warning,
				}),
			],
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	// Initial deferral to prevent timeouts
	await i.deferReply({ flags: MessageFlags.Ephemeral });

	// Handle set manager role subcommand
	if (i.options.getSubcommand() === "set_role") {
		await setManagerRole(cid, i, cachedGuild);
		return;
	}
};
