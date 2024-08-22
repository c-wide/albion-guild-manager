export const search = {
	name: "search",
	desc: "Retrieve detailed information about a player, guild, or alliance",
	option: {
		searchTerm: {
			desc: "The name of the player, guild, or alliance to search for",
		},
	},
	response: {
		searching: "Searching for {{entityType}} details...",
		selectEntity: "Select the {{entityType}} you want to search for",
	},
} as const;
