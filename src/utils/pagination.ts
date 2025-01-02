import {
	ActionRowBuilder,
	ButtonBuilder,
	type ButtonInteraction,
	ButtonStyle,
	type CommandInteraction,
	ComponentType,
	type EmbedBuilder,
	type InteractionCollector,
	type Message,
} from "discord.js";
import { MessageFlags } from "discord.js";
import { logger } from "#src/utils/logger.ts";
import { getErrorMessage } from "#src/utils/misc.ts";

export type PaginationOptions = {
	collectorTimeout?: number;
	ephemeral?: boolean;
};

export class PaginationEmbed {
	private embeds: EmbedBuilder[];
	private currentPage: number;
	private message: Message | null;
	private authorizedUsers: Set<string>;
	private collector: InteractionCollector<ButtonInteraction> | null;
	private options: PaginationOptions;

	constructor(embeds: EmbedBuilder[], options: PaginationOptions = {}) {
		this.embeds = embeds;
		this.currentPage = 0;
		this.message = null;
		this.authorizedUsers = new Set();
		this.collector = null;
		this.options = {
			collectorTimeout: options.collectorTimeout ?? 5 * 60000,
			ephemeral: options.ephemeral ?? false,
		};
	}

	private createButtons(): ActionRowBuilder<ButtonBuilder> {
		return new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId("first")
				.setEmoji("⏮")
				.setStyle(ButtonStyle.Primary)
				.setDisabled(this.currentPage === 0),
			new ButtonBuilder()
				.setCustomId("previous")
				.setEmoji("◀")
				.setStyle(ButtonStyle.Primary)
				.setDisabled(this.currentPage === 0),
			new ButtonBuilder()
				.setCustomId("counter")
				.setLabel(`${this.currentPage + 1}/${this.embeds.length}`)
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(true),
			new ButtonBuilder()
				.setCustomId("next")
				.setEmoji("▶")
				.setStyle(ButtonStyle.Primary)
				.setDisabled(this.currentPage === this.embeds.length - 1),
			new ButtonBuilder()
				.setCustomId("last")
				.setEmoji("⏭")
				.setStyle(ButtonStyle.Primary)
				.setDisabled(this.currentPage === this.embeds.length - 1),
		);
	}

	private async createCollector(message: Message): Promise<void> {
		this.collector = message.createMessageComponentCollector({
			filter: (i) => this.authorizedUsers.has(i.user.id),
			time: this.options.collectorTimeout,
			componentType: ComponentType.Button,
		});

		this.collector.on("collect", async (i) => {
			try {
				switch (i.customId) {
					case "first": {
						this.currentPage = 0;
						break;
					}
					case "previous": {
						this.currentPage = Math.max(0, this.currentPage - 1);
						break;
					}
					case "next": {
						this.currentPage = Math.min(
							this.embeds.length - 1,
							this.currentPage + 1,
						);
						break;
					}
					case "last": {
						this.currentPage = this.embeds.length - 1;
						break;
					}
					default:
						return;
				}

				await i.update({
					embeds: [this.embeds[this.currentPage]],
					components: [this.createButtons()],
				});
			} catch (error) {
				logger.error(
					{
						error: getErrorMessage(error),
					},
					"An error occurred while handling a pagination button interaction",
				);
			}
		});
	}

	async reply(i: CommandInteraction): Promise<Message> {
		if (this.embeds.length === 0) {
			throw new Error("Attempted to render a pagination embed with no embeds");
		}

		this.message = await i.reply({
			embeds: [this.embeds[this.currentPage]],
			components: [this.createButtons()],
			flags: this.options.ephemeral ? MessageFlags.Ephemeral : undefined,
			fetchReply: true,
		});

		await this.createCollector(this.message);
		this.authorizedUsers.add(i.user.id);

		return this.message;
	}

	async followUp(i: CommandInteraction): Promise<Message> {
		if (this.embeds.length === 0) {
			throw new Error("Attempted to render a pagination embed with no embeds");
		}

		this.message = await i.followUp({
			embeds: [this.embeds[this.currentPage]],
			components: [this.createButtons()],
			flags: this.options.ephemeral ? MessageFlags.Ephemeral : undefined,
			fetchReply: true,
		});

		await this.createCollector(this.message);
		this.authorizedUsers.add(i.user.id);

		return this.message;
	}

	async setEmbeds(embeds: EmbedBuilder[]): Promise<void> {
		this.embeds = embeds;
		this.currentPage = 0;

		if (this.message) {
			await this.message.edit({
				embeds: [this.embeds[this.currentPage]],
				components: [this.createButtons()],
			});
		}
	}

	async cleanup(): Promise<void> {
		if (this.collector) {
			this.collector.stop();
			this.collector = null;
		}

		if (this.message) {
			await this.message.delete();
			this.message = null;
		}

		this.currentPage = 0;
	}
}
