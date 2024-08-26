import type { Alliance, Gathering, GuildInfo, Player, PVE } from "albion-sdk";
import { EmbedBuilder, type Locale, type APIEmbedField } from "discord.js";
import type { EntityDetails } from "~/features/lookup/search";
import type { SearchOptions } from "~/features/lookup/options";
import { config } from "~/utils/config";
import i18n from "~/utils/i18n";

const defaultEmbedColor = "#248eff";

const linkMap = {
	albionRegistry: {
		name: "Albion Registry",
		url: "https://registry.albion.tools",
	},
	albionbb: {
		name: "albionbb",
		"url-Americas": "https://albionbb.com",
		"url-Asia": "https://east.albionbb.com",
		"url-Europe": "https://europe.albionbb.com",
	},
	murderLedger: {
		name: "Murder Ledger",
		"url-Americas": "https://murderledger.albiononline2d.com",
		"url-Asia": "https://murderledger-asia.albiononline2d.com",
		"url-Europe": "https://murderledger-europe.albiononline2d.com",
	},
} as const;

export function createEmbed(
	entityDetails: EntityDetails,
	options: SearchOptions,
	locale: Locale,
): EmbedBuilder {
	const { entityType } = options;

	switch (entityType) {
		case "player":
			return createPlayerEmbed(entityDetails as Player, options, locale);
		case "guild":
			return createGuildEmbed(entityDetails as GuildInfo, options, locale);
		case "alliance":
			return createAllianceEmbed(entityDetails as Alliance, options, locale);
		default:
			throw new Error("Invalid entity type");
	}
}

function createField(
	key: string,
	value: string | number,
	locale: Locale,
	inline = true,
): APIEmbedField {
	return {
		// @ts-ignore
		name: i18n.t(`phrases.${key}`, { ns: "common", lng: locale }),
		value:
			typeof value === "number"
				? new Intl.NumberFormat(locale).format(value)
				: value || i18n.t("phrases.na", { ns: "common", lng: locale }),
		inline,
	};
}

function createEmptyField(inline: boolean): APIEmbedField {
	return {
		name: " ",
		value: " ",
		inline,
	};
}

function createPveOrGatherField(
	target: PVE | Gathering,
	i18nFieldMaps: {
		key: string;
		field: string;
	}[],
	lng: Locale,
): APIEmbedField {
	const identifier = "Royal" in target ? "pve" : "gathering";

	const value = i18nFieldMaps
		.map((fieldMap) => {
			// Extract value from generic target
			const container = target[fieldMap.field as keyof typeof target] as
				| number
				| Record<string, number>;

			// If target is Gathering the total is stored in an obj
			const targetValue =
				typeof container === "object" ? container.Total : container;

			// @ts-ignore
			return `**${i18n.t(`phrases.${fieldMap.key}Label`, {
				ns: "common",
				lng,
			})}** *${targetValue.toLocaleString(lng)}*`;
		})
		.join("\n");

	return {
		name: i18n.t(`phrases.${identifier}Fame`, { ns: "common", lng }),
		value,
		inline: true,
	};
}

function createPveField(pve: PVE, locale: Locale): APIEmbedField {
	const i18nFieldMaps = [
		{ key: "royal", field: "Royal" },
		{ key: "outlands", field: "Outlands" },
		{ key: "avalon", field: "Avalon" },
		{ key: "hg", field: "Hellgate" },
		{ key: "corrupted", field: "CorruptedDungeon" },
		{ key: "mists", field: "Mists" },
		{ key: "total", field: "Total" },
	];

	return createPveOrGatherField(pve, i18nFieldMaps, locale);
}

function createGatherField(gather: Gathering, locale: Locale): APIEmbedField {
	const i18nFieldMaps = [
		{ key: "fiber", field: "Fiber" },
		{ key: "hide", field: "Hide" },
		{ key: "ore", field: "Ore" },
		{ key: "stone", field: "Rock" },
		{ key: "wood", field: "Wood" },
		{ key: "total", field: "All" },
	];

	return createPveOrGatherField(gather, i18nFieldMaps, locale);
}

type Links = {
	labeli18nKey: string;
	labelUrl: string;
	pbName: string;
	pbUrl: string;
}[];

function createLinksField(links: Links, lng: Locale): APIEmbedField {
	const value = links
		.map((link) => {
			// @ts-ignore
			const label = `[${i18n.t(`phrases.${link.labeli18nKey}`, {
				ns: "common",
				lng,
			})}](${link.labelUrl})`;

			const pb = `${i18n.t("phrases.poweredByLabel", {
				name: link.pbName,
				url: link.pbUrl,
				ns: "common",
				lng,
				interpolation: {
					escapeValue: false,
				},
			})}`;

			return `${label}${pb}`;
		})
		.join("\n");

	return {
		name: i18n.t("phrases.link_other", { ns: "common", lng }),
		value,
		inline: false,
	};
}

function createPlayerEmbed(
	entityDetails: Player,
	options: SearchOptions,
	lng: Locale,
): EmbedBuilder {
	const { entityType, serverRegion } = options;
	const ls = entityDetails.LifetimeStatistics;

	const links: Links = [
		{
			labeli18nKey: "gaHistory",
			labelUrl: `${
				linkMap.albionRegistry.url
			}/${entityType}/${serverRegion.toLowerCase()}/${entityDetails.Id}`,
			pbName: linkMap.albionRegistry.name,
			pbUrl: linkMap.albionRegistry.url,
		},
		{
			labeli18nKey: "battleHistory",
			labelUrl: `${linkMap.albionbb[`url-${serverRegion}`]}/?search=${
				entityDetails.Name
			}`,
			pbName: linkMap.albionbb.name,
			pbUrl: linkMap.albionbb[`url-${serverRegion}`],
		},
		{
			labeli18nKey: "pvpHistory",
			labelUrl: `${linkMap.murderLedger[`url-${serverRegion}`]}/players/${
				entityDetails.Name
			}/ledger`,
			pbName: linkMap.murderLedger.name,
			pbUrl: linkMap.murderLedger[`url-${serverRegion}`],
		},
	];

	const fields: APIEmbedField[] = [
		createField("uid", `\`\`\`${entityDetails.Id}\`\`\``, lng, false),
		createField("name", entityDetails.Name, lng),
		createField("guild_one", entityDetails.GuildName, lng),
		createField("alliance_one", entityDetails.AllianceName, lng),
		createField("killFame", entityDetails.KillFame, lng),
		createField("deathFame", entityDetails.DeathFame, lng),
		createField("kdRatio", entityDetails.FameRatio.toFixed(2), lng),
		createPveField(ls.PvE, lng),
		createGatherField(ls.Gathering, lng),
		createEmptyField(false),
		createField("craftingFame", ls.Crafting.Total, lng),
		createField("farmingFame", ls.FarmingFame, lng),
		createField("fishingFame", ls.FishingFame, lng),
		createLinksField(links, lng),
	];

	return new EmbedBuilder()
		.setTitle(i18n.t("phrases.playerInfo", { ns: "common", lng }))
		.addFields(fields)
		.setColor(defaultEmbedColor)
		.setFooter({
			text: config.botName,
			iconURL: config.avatarURL,
		});
}

function createGuildEmbed(
	entityDetails: GuildInfo,
	options: SearchOptions,
	lng: Locale,
): EmbedBuilder {
	const { entityType, serverRegion } = options;

	const links: Links = [
		{
			labeli18nKey: "paHistory",
			labelUrl: `${
				linkMap.albionRegistry.url
			}/${entityType}/${serverRegion.toLowerCase()}/${entityDetails.Id}`,
			pbName: linkMap.albionRegistry.name,
			pbUrl: linkMap.albionRegistry.url,
		},
		{
			labeli18nKey: "battleHistory",
			labelUrl: `${
				linkMap.albionbb[`url-${serverRegion}`]
			}/?search=${entityDetails.Name.replaceAll(" ", "+")}`,
			pbName: linkMap.albionbb.name,
			pbUrl: linkMap.albionbb[`url-${serverRegion}`],
		},
	];

	const fields: APIEmbedField[] = [
		createField("uid", `\`\`\`${entityDetails.Id}\`\`\``, lng, false),
		createField("name", entityDetails.Name, lng),
		createField(
			"allyTag",
			entityDetails.AllianceTag ? `[${entityDetails.AllianceTag}]` : "",
			lng,
		),
		createField("memberCount", entityDetails.MemberCount, lng),
		createField("killFame", entityDetails.killFame, lng),
		createField("deathFame", entityDetails.DeathFame, lng),
		createField(
			"kdRatio",
			(entityDetails.killFame / entityDetails.DeathFame).toFixed(2),
			lng,
		),
		createField("founderName", entityDetails.FounderName, lng),
		createField("creationDate", entityDetails.Founded.split("T")[0], lng),
		createLinksField(links, lng),
	];

	return new EmbedBuilder()
		.setTitle(i18n.t("phrases.guildInfo", { ns: "common", lng }))
		.addFields(fields)
		.setColor(defaultEmbedColor)
		.setFooter({
			text: config.botName,
			iconURL: config.avatarURL,
		});
}

function createAllianceEmbed(
	entityDetails: Alliance,
	options: SearchOptions,
	lng: Locale,
): EmbedBuilder {
	const { entityType, serverRegion } = options;

	const links: Links = [
		{
			labeli18nKey: "guildHistory",
			labelUrl: `${
				linkMap.albionRegistry.url
			}/${entityType}/${serverRegion.toLowerCase()}/${
				entityDetails.AllianceId
			}`,
			pbName: linkMap.albionRegistry.name,
			pbUrl: linkMap.albionRegistry.url,
		},
		{
			labeli18nKey: "battleHistory",
			labelUrl: `${
				linkMap.albionbb[`url-${serverRegion}`]
			}/?search=${entityDetails.AllianceName.replaceAll(" ", "+")}`,
			pbName: linkMap.albionbb.name,
			pbUrl: linkMap.albionbb[`url-${serverRegion}`],
		},
	];

	const fields: APIEmbedField[] = [
		createField("uid", `\`\`\`${entityDetails.AllianceId}\`\`\``, lng, false),
		createField("name", entityDetails.AllianceName, lng),
		createField("tag", `[${entityDetails.AllianceTag}]`, lng),
		createEmptyField(false),
		createField("founderName", entityDetails.FounderName, lng),
		createField("creationDate", entityDetails.Founded.split("T")[0], lng),
		createEmptyField(false),
		createField(
			"guild_other",
			entityDetails.Guilds.map((g) => g.Name).join("\n"),
			lng,
		),
		createField("memberCount", entityDetails.NumPlayers, lng),
		createLinksField(links, lng),
	];

	return new EmbedBuilder()
		.setTitle(i18n.t("phrases.allyInfo", { ns: "common", lng }))
		.addFields(fields)
		.setColor(defaultEmbedColor)
		.setFooter({
			text: config.botName,
			iconURL: config.avatarURL,
		});
}
