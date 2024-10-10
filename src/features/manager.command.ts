import assert from "node:assert";
import {
	type ChatInputCommandInteraction,
	InteractionContextType,
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
import { and, eq } from "drizzle-orm";

export const cooldown = 5;

export const builder = new SlashCommandBuilder()
	.setName(i18n.t("managers.name", { ns: "commands", lng: "en" }))
	.setDescription(i18n.t("managers.desc", { ns: "commands", lng: "en" }))
	.addSubcommandGroup((group) =>
		group
			.setName(i18n.t("managers.group.add.name", { ns: "commands", lng: "en" }))
			.setDescription(
				i18n.t("managers.group.add.desc", { ns: "commands", lng: "en" }),
			)
			.addSubcommand((subcommand) =>
				subcommand
					.setName(
						i18n.t("managers.group.add.subcommands.role.name", {
							ns: "commands",
							lng: "en",
						}),
					)
					.setDescription(
						i18n.t("managers.group.add.subcommands.role.desc", {
							ns: "commands",
							lng: "en",
						}),
					)
					.addRoleOption((option) =>
						option
							.setName(
								i18n.t(
									"managers.group.add.subcommands.role.options.role.name",
									{ ns: "commands", lng: "en" },
								),
							)
							.setDescription(
								i18n.t(
									"managers.group.add.subcommands.role.options.role.desc",
									{ ns: "commands", lng: "en" },
								),
							)
							.setRequired(true),
					),
			)
			.addSubcommand((subcommand) =>
				subcommand
					.setName(
						i18n.t("managers.group.add.subcommands.user.name", {
							ns: "commands",
							lng: "en",
						}),
					)
					.setDescription(
						i18n.t("managers.group.add.subcommands.user.desc", {
							ns: "commands",
							lng: "en",
						}),
					)
					.addUserOption((option) =>
						option
							.setName(
								i18n.t(
									"managers.group.add.subcommands.user.options.user.name",
									{ ns: "commands", lng: "en" },
								),
							)
							.setDescription(
								i18n.t(
									"managers.group.add.subcommands.user.options.user.desc",
									{ ns: "commands", lng: "en" },
								),
							)
							.setRequired(true),
					),
			),
	)
	.addSubcommandGroup((group) =>
		group
			.setName(
				i18n.t("managers.group.remove.name", { ns: "commands", lng: "en" }),
			)
			.setDescription(
				i18n.t("managers.group.remove.desc", { ns: "commands", lng: "en" }),
			)
			.addSubcommand((subcommand) =>
				subcommand
					.setName(
						i18n.t("managers.group.remove.subcommands.role.name", {
							ns: "commands",
							lng: "en",
						}),
					)
					.setDescription(
						i18n.t("managers.group.remove.subcommands.role.desc", {
							ns: "commands",
							lng: "en",
						}),
					)
					.addRoleOption((option) =>
						option
							.setName(
								i18n.t(
									"managers.group.remove.subcommands.role.options.role.name",
									{ ns: "commands", lng: "en" },
								),
							)
							.setDescription(
								i18n.t(
									"managers.group.remove.subcommands.role.options.role.desc",
									{ ns: "commands", lng: "en" },
								),
							)
							.setRequired(true),
					),
			)
			.addSubcommand((subcommand) =>
				subcommand
					.setName(
						i18n.t("managers.group.remove.subcommands.user.name", {
							ns: "commands",
							lng: "en",
						}),
					)
					.setDescription(
						i18n.t("managers.group.remove.subcommands.user.desc", {
							ns: "commands",
							lng: "en",
						}),
					)
					.addUserOption((option) =>
						option
							.setName(
								i18n.t(
									"managers.group.remove.subcommands.user.options.user.name",
									{ ns: "commands", lng: "en" },
								),
							)
							.setDescription(
								i18n.t(
									"managers.group.remove.subcommands.user.options.user.desc",
									{ ns: "commands", lng: "en" },
								),
							)
							.setRequired(true),
					),
			),
	)
	.addSubcommand((subcommand) =>
		subcommand
			.setName(
				i18n.t("managers.subcommands.view.name", {
					ns: "commands",
					lng: "en",
				}),
			)
			.setDescription(
				i18n.t("managers.subcommands.view.desc", {
					ns: "commands",
					lng: "en",
				}),
			),
	)
	.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
	.setContexts(InteractionContextType.Guild);

async function removeManager(
	cid: string,
	i: ChatInputCommandInteraction,
	cache: GuildDetails,
): Promise<void> {
	// Extract subcommand option string
	const command = i.options.getSubcommand(true) as "role" | "user";

	// Figure out which type of manager is being added
	const targetSetting =
		command === "role" ? Settings.ManagerRoles : Settings.ManagerUsers;

	// Extract the role or user id
	const targetId =
		command === "role"
			? i.options.getRole("role", true).id
			: i.options.getUser("user", true).id;

	// Extract current managers from cached guild settings
	let managers = (cache.settings.get(targetSetting) ?? []) as string[];

	// Handle manager not already existing for this server
	if (!managers.includes(targetId)) {
		logger.info(
			{ cid, type: command, id: targetId },
			"Target is not a manager",
		);
		await i.followUp({
			content: "",
			embeds: [
				createGenericEmbed({
					title: " ",
					description: i18n.t(`managers.responses.${command}NotManager`, {
						target: targetId,
						ns: "commands",
						lng: i.locale,
					}),
					color: config.colors.info,
				}),
			],
		});
		return;
	}

	// If manager does exist, remove them from the array
	managers = managers.filter((managerId) => managerId !== targetId);

	// Update db
	await db
		.update(serverSettings)
		.set({
			value: managers,
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(serverSettings.serverId, cache.id),
				eq(serverSettings.key, targetSetting),
			),
		);

	// Update cache
	cache.settings.set(targetSetting, managers);

	// Log things
	logger.info(
		{ cid, type: command, id: targetId },
		"Target removed from managers",
	);

	// If nothing went wrong, let the user know their operation was successful
	await i.followUp({
		content: "",
		embeds: [
			createGenericEmbed({
				title: " ",
				description: i18n.t(
					`managers.responses.remove${command === "role" ? "Role" : "User"}`,
					{ target: targetId, ns: "commands", lng: i.locale },
				),
				color: config.colors.success,
			}),
		],
	});
}

async function addManager(
	cid: string,
	i: ChatInputCommandInteraction,
	cache: GuildDetails,
): Promise<void> {
	// Extract subcommand option string
	const command = i.options.getSubcommand(true) as "role" | "user";

	// Figure out which type of manager is being added
	const targetSetting =
		command === "role" ? Settings.ManagerRoles : Settings.ManagerUsers;

	// Extract the role or user id
	const targetId =
		command === "role"
			? i.options.getRole("role", true).id
			: i.options.getUser("user", true).id;

	// Extract current managers from cached guild settings
	let managers = (cache.settings.get(targetSetting) ?? []) as string[];

	// Handle manager already existing for this server
	if (managers.includes(targetId)) {
		logger.info(
			{ cid, type: command, id: targetId },
			"Target is already manager",
		);
		await i.followUp({
			content: "",
			embeds: [
				createGenericEmbed({
					title: " ",
					description: i18n.t(`managers.responses.${command}AlreadyManager`, {
						target: targetId,
						ns: "commands",
						lng: i.locale,
					}),
					color: config.colors.info,
				}),
			],
		});
		return;
	}

	// If manager doesn't already exist, add them to the array
	managers.push(targetId);

	// Update db
	await db
		.insert(serverSettings)
		.values({
			serverId: cache.id,
			key: targetSetting,
			value: managers,
		})
		.onConflictDoUpdate({
			target: [serverSettings.serverId, serverSettings.key],
			set: {
				value: managers,
				updatedAt: new Date(),
			},
		});

	// Update cache
	cache.settings.set(targetSetting, managers);

	// Log things
	logger.info({ cid, type: command, id: targetId }, "Target added to managers");

	// If nothing went wrong, let the user know their operation was successful
	await i.followUp({
		content: "",
		embeds: [
			createGenericEmbed({
				title: " ",
				description: i18n.t(
					`managers.responses.add${command === "role" ? "Role" : "User"}`,
					{ target: targetId, ns: "commands", lng: i.locale },
				),
				color: config.colors.success,
			}),
		],
	});
}

async function viewManagers(
	cid: string,
	i: ChatInputCommandInteraction,
	cache: GuildDetails,
): Promise<void> {
	// Extract role and user manager settings
	const roles = (cache.settings.get(Settings.ManagerRoles) ?? []) as string[];
	const users = (cache.settings.get(Settings.ManagerUsers) ?? []) as string[];

	// If no managers are configured, tell them and bail
	if (roles.length === 0 && users.length === 0) {
		logger.info({ cid }, "No managers configured");
		await i.followUp({
			content: "",
			embeds: [
				createGenericEmbed({
					title: " ",
					description: i18n.t("managers.responses.noManagers", {
						ns: "commands",
						lng: i.locale,
					}),
					color: config.colors.info,
				}),
			],
		});
		return;
	}

	// Log things
	logger.info({ cid }, "Displaying configured managers");

	// If you're here that means managers have been configured, show the user
	await i.followUp({
		content: "",
		embeds: [
			createGenericEmbed({
				title: i18n.t("managers.embeds.botManagers.title", {
					ns: "commands",
					lng: i.locale,
				}),
				description: " ",
				fields: [
					{
						name: i18n.t("managers.embeds.botManagers.fields.roles.name", {
							ns: "commands",
							lng: i.locale,
						}),
						value:
							roles.length === 0
								? i18n.t("managers.embeds.common.na", {
										ns: "commands",
										lng: i.locale,
									})
								: roles.map((role) => `<@&${role}>`).join("\n"),
						inline: true,
					},
					{
						name: i18n.t("managers.embeds.botManagers.fields.users.name", {
							ns: "commands",
							lng: i.locale,
						}),
						value:
							users.length === 0
								? i18n.t("managers.embeds.common.na", {
										ns: "commands",
										lng: i.locale,
									})
								: users.map((user) => `<@${user}>`).join("\n"),
						inline: true,
					},
				],
				color: config.colors.info,
			}),
		],
	});
}

// TODO: handle manager role being delete or user leaving server
export const handler: CommandHandler = async ({ cid, i }) => {
	// Retreive cached guild
	const cachedGuild = guildCache.get(i.guildId ?? "");
	assert(cachedGuild, "Guild not found in cache");

	// Only users with ManageGuild permission can add/remove managers
	if (i.memberPermissions?.has(PermissionFlagsBits.ManageGuild) === false) {
		logger.info({ cid }, "User lacks permission");
		await i.reply({
			content: "",
			ephemeral: true,
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
		});
		return;
	}

	// Initial deferral to prevent timeouts
	await i.deferReply({ ephemeral: true });

	// Handle view subcommand and display manager roles/users
	if (i.options.getSubcommand() === "view") {
		await viewManagers(cid, i, cachedGuild);
		return;
	}

	// We've made it here so we want to add or remove managers
	switch (i.options.getSubcommandGroup(true)) {
		case "add":
			await addManager(cid, i, cachedGuild);
			break;
		case "remove":
			await removeManager(cid, i, cachedGuild);
			break;
	}
};
