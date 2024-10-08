export const serverStatus = {
	name: "serverstatus",
	desc: "Configure Albion Online server status notifications",
	group: {
		regions: {
			name: "regions",
			desc: "Manage tracked server regions",
			subcommands: {
				add: {
					name: "add",
					desc: "Add a region to track",
				},
				remove: {
					name: "remove",
					desc: "Remove a tracked region",
				},
				view: {
					name: "view",
					desc: "View tracked regions",
				},
			},
		},
	},
	subcommands: {
		enable: {
			name: "enable",
			desc: "Turn on status notifications",
		},
		disable: {
			name: "disable",
			desc: "Turn off status notifications",
		},
		channel: {
			name: "channel",
			desc: "Set notification channel",
			options: {
				channel: {
					name: "channel",
					desc: "Channel for notifications",
				},
			},
		},
	},
	embeds: {
		viewRegions: {
			title: "Tracked Albion Online Regions",
		},
		serverStatus: {
			title: "{{region}} Server Status",
			fields: {
				status: {
					name: "Status",
					online: "Online",
					offline: "Offline",
				},
				timestamp: {
					name: "Timestamp",
				},
			},
		},
	},
	responses: {
		noPermission: "You lack permission to use this command",
		regionAlreadyConfigured: "This region is already being tracked",
		regionAdded: "Region added successfully",
		regionNotConfigured: "This region is not being tracked",
		regionRemoved: "Region removed successfully",
		noRegionsConfigured: "No regions are currently being tracked",
		notificationsAlreadyEnabled: "Status notifications are already on",
		channelNotConfigured: "Set a notification channel before enabling",
		noRegionsTracked: "Add a region to track before enabling notifications",
		notificationsEnabled: "Status notifications turned on",
		notificationsAlreadyDisabled: "Status notifications are already off",
		notificationsDisabled: "Status notifications turned off",
		wrongChannelType: "Please select a text channel",
		sameChannel: "This channel is already set for notifications",
		channelSet: "Status notifications will be posted in <#{{channelId}}>",
	},
} as const;
