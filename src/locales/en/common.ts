export const common = {
	// Common translations
	"cmd-res-cooldown-title": "Whoa! You're Fast!",
	"cmd-res-cooldown-desc":
		'Please wait, you are on a cooldown for the "{{commandName}}" command. You can use it again <t:{{discordTimestamp}}:R>.',
	"select-menu-placeholder": "Make a selection!",

	// Common error translations
	"embed-err-generic-title": "Uh Oh! Something Went Wrong!",
	"embed-err-generic-footer": `If you continue to experience this issue, please visit our [Discord]({{url}}) for assistance.`,
	"cmd-err-generic": "An error occurred while handling the command",
	"cmd-err-unknown": "The command you attempted to use does not exist",
	"cmd-err-ao-api":
		"We encountered an error while interacting with the Albion Online API. Please try again...\n\n*The API for the Americas server is usually under heavy load which causes requests to frequently time out*",

	// Common command option translations
	"cmd-opt-isPublic-name": "is_public",
	"cmd-opt-isPublic-desc":
		"Should the command response should be publicly visible",
	"cmd-opt-choice-player": "Player",
	"cmd-opt-choice-guild": "Guild",
	"cmd-opt-choice-alliance": "Alliance",
	"cmd-opt-choice-Americas": "Americas",
	"cmd-opt-choice-Asia": "Asia",
	"cmd-opt-choice-Europe": "Europe",

	// UTC command translations
	"cmd-utc-name": "utc",
	"cmd-utc-desc": "Get the current UTC time",
	"cmd-utc-res": ":clock3: **{{utcTime}}**",

	// Search command translations
	"cmd-search-name": "search",
	"cmd-search-desc":
		"Retrieve detailed information about a player, guild, or alliance",
	"cmd-search-opt-entityType-name": "entity_type",
	"cmd-search-opt-entityType-desc": "The type of entity to search for",
	"cmd-search-opt-serverRegion-name": "server_region",
	"cmd-search-opt-serverRegion-desc": "Which Albion Online server to search",
	"cmd-search-opt-searchTerm-name": "search_term",
	"cmd-search-opt-searchTerm-desc":
		"The name of the player, guild, or alliance to search for",
	"cmd-search-res-noResults-title": "No Results Found",
	"cmd-search-res-noResults-desc":
		'No {{entityType}} found matching "{{searchTerm}}"',
	"cmd-search-res-selectEntity":
		"Select the {{entityType}} you want to search for",
	"cmd-search-res-noConfirm-title": "Confirmation Not Received",
	"cmd-search-res-noConfirm-desc":
		"Confirmation was not received within {{timeframe}}. Please try again...",
	"cmd-search-res-search-desc": "ID: {{id}}",
	"cmd-search-res-searching": "Searching for {{entityType}} details...",
	"cmd-search-embed-playerInfo": "Player Information",
	"cmd-search-embed-uid": "Unique ID",
	"cmd-search-embed-name": "Name",
	"cmd-search-embed-playerInfo-guild": "Guild",
	"cmd-search-embed-playerInfo-alliance": "Alliance",
	"cmd-search-embed-na": "N/A",
	"cmd-search-embed-killFame": "Kill Fame",
	"cmd-search-embed-deathFame": "Death Fame",
	"cmd-search-embed-kdRatio": "Ratio",
	"cmd-search-embed-playerInfo-pve": "PvE Fame",
	"cmd-search-embed-playerInfo-pve-royal": "Royal:",
	"cmd-search-embed-playerInfo-pve-outlands": "Outlands:",
	"cmd-search-embed-playerInfo-pve-avalon": "Avalon:",
	"cmd-search-embed-playerInfo-pve-hg": "Hellgate:",
	"cmd-search-embed-playerInfo-pve-corrupted": "Corrupted:",
	"cmd-search-embed-playerInfo-pve-mists": "Mists:",
	"cmd-search-embed-total": "Total:",
	"cmd-search-embed-playerInfo-gather": "Gathering Fame",
	"cmd-search-embed-playerInfo-gather-fiber": "Fiber:",
	"cmd-search-embed-playerInfo-gather-hide": "Hide:",
	"cmd-search-embed-playerInfo-gather-ore": "Ore:",
	"cmd-search-embed-playerInfo-gather-stone": "Stone:",
	"cmd-search-embed-playerInfo-gather-wood": "Wood:",
	"cmd-search-embed-playerInfo-craft": "Crafting Fame",
	"cmd-search-embed-playerInfo-farm": "Farming Fame",
	"cmd-search-embed-playerInfo-fish": "Fishing Fame",
	"cmd-search-embed-links": "Links",
	"cmd-search-embed-links-gaHistory": "Guild / Alliance History",
	"cmd-search-embed-links-battleHistory": "Battle History",
	"cmd-search-embed-links-pvpHistory": "PvP History",
	"cmd-search-embed-links-poweredBy": " - Powered by [{{name}}]({{url}})",
	"cmd-search-embed-guildInfo": "Guild Information",
	"cmd-search-embed-guildInfo-allyTag": "Alliance Tag",
	"cmd-search-embed-memberCount": "Member Count",
	"cmd-search-embed-founderName": "Founder Name",
	"cmd-search-embed-creationDate": "Creation Date",
	"cmd-search-embed-links-paHistory": "Player / Alliance History",
	"cmd-search-embed-allyInfo": "Alliance Information",
	"cmd-search-embed-allyInfo-tag": "Tag",
	"cmd-search-embed-allyInfo-guilds": "Guilds",
	"cmd-search-embed-links-gHistory": "Guild History",
} as const;
