import assert from "node:assert";
import { until } from "@open-draft/until";
import {
	type ChatInputCommandInteraction,
	InteractionContextType,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from "discord.js";
import { db } from "~/database/db";
import { serverSettings } from "~/database/schema";
import type { CommandHandler } from "~/utils/command";
import { config } from "~/utils/config";
import i18n from "~/utils/i18n";
import { logger } from "~/utils/logger";
import {
	Settings,
	createErrorEmbed,
	createGenericEmbed,
	getServerId,
	guildCache,
} from "~/utils/misc";

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

async function alterManagers(i: ChatInputCommandInteraction): Promise<void> {
	// Fetch server id and cached guild
	const serverId = getServerId(i.guildId);
	assert(serverId, "Server ID not found in cache");

	const cachedGuild = guildCache.get(i.guildId ?? "");
	assert(cachedGuild, "Guild not found in cache");

	// Extract options
	const group = i.options.getSubcommandGroup(true) as "add" | "remove";
	const command = i.options.getSubcommand(true) as "role" | "user";

	const targetSetting =
		command === "role" ? Settings.ManagerRoles : Settings.ManagerUsers;

	const targetId =
		command === "role"
			? i.options.getRole("role", true).id
			: i.options.getUser("user", true).id;

	// Extract current managers from cached guild settings
	let managers = (cachedGuild.settings.get(targetSetting) ?? []) as string[];

	// Depending on the action, add or remove the manager
	if (group === "add") {
		// Handle manager already existing for this server
		if (managers.includes(targetId)) {
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
						color: config.colors.warning,
					}),
				],
			});
			return;
		}

		// If manager doesn't already exist, add them to the array
		managers.push(targetId);
	} else {
		// Handle manager not already existing for this server
		if (!managers.includes(targetId)) {
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
						color: config.colors.warning,
					}),
				],
			});
			return;
		}

		// If manager does exist, remove them from the array
		managers = managers.filter((managerId) => managerId !== targetId);
	}

	// Upsert managers
	await db
		.insert(serverSettings)
		.values({
			serverId,
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
	cachedGuild.settings.set(targetSetting, managers);

	// If nothing went wrong, let the user know their operation was successful
	await i.followUp({
		content: "",
		embeds: [
			createGenericEmbed({
				title: " ",
				description: i18n.t(
					`managers.responses.${group}${command === "role" ? "Role" : "User"}`,
					{ target: targetId, ns: "commands", lng: i.locale },
				),
				color: config.colors.success,
			}),
		],
	});
}

async function viewManagers(i: ChatInputCommandInteraction): Promise<void> {
	// Fetch server id and cached guild
	const serverId = getServerId(i.guildId);
	assert(serverId, "Server ID not found in cache");

	const cachedGuild = guildCache.get(i.guildId ?? "");
	assert(cachedGuild, "Guild not found in cache");

	// Extract role and user manager settings
	const roles = (cachedGuild.settings.get(Settings.ManagerRoles) ??
		[]) as string[];
	const users = (cachedGuild.settings.get(Settings.ManagerUsers) ??
		[]) as string[];

	// If no managers are configured, tell them and bail
	if (roles.length === 0 && users.length === 0) {
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

// TODO: update to use cid
// TODO: handle deleted role as manager
export const handler: CommandHandler = async ({ i }) => {
	logger.info(
		{
			serverId: getServerId(i.guildId),
			userId: i.user.id,
			subcommand: i.options.getSubcommand(),
			subcommandGroup: i.options.getSubcommandGroup() ?? undefined,
			targetId:
				i.options.getSubcommand() === "role"
					? i.options.getRole("role")?.id
					: i.options.getUser("user")?.id,
		},
		"Managers command details",
	);

	// Only users with ManageGuild permission can add/remove managers
	if (i.memberPermissions?.has(PermissionFlagsBits.ManageGuild) === false) {
		logger.info(
			{
				serverId: getServerId(i.guildId),
				userId: i.user.id,
				cmdName: "managers",
			},
			"Command executed without proper permission",
		);
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
		const { error } = await until(() => viewManagers(i));
		if (error) {
			logger.error(
				{ serverId: getServerId(i.guildId), userId: i.user.id, error },
				"Error while viewing managers",
			);

			await i.followUp({
				content: "",
				embeds: [
					createErrorEmbed(
						i18n.t("managers.responses.viewErr", {
							ns: "commands",
							lng: i.locale,
						}),
						i.locale,
					),
				],
			});
		}
		return;
	}

	// We've made it here so we want to add/remove managers
	const { error } = await until(() => alterManagers(i));

	if (error) {
		logger.error(
			{ serverId: getServerId(i.guildId), userId: i.user.id, error },
			"Error while updating managers",
		);
		await i.followUp({
			content: "",
			embeds: [
				createErrorEmbed(
					i18n.t("managers.responses.updateErr", {
						ns: "commands",
						lng: i.locale,
					}),
					i.locale,
				),
			],
		});
		return;
	}
};
