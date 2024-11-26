export const serverStatus = {
	name: "serverstatus",
	desc: "Configure Albion Online server status notifications",
	groups: {
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
		setup: {
			name: "setup",
			desc: "Start an interactive setup process for status notifications",
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
		confirmation: {
			title: "Settings Confirmation",
			fields: {
				selectedRegions: "Selected Regions",
				selectedChannel: "Selected Channel",
			},
		},
		completed: {
			title: "Setup Completed",
			desc: "Server status notifications will be posted in <#{{channelId}}>",
		},
	},
	components: {
		selectChannel: {
			placeholder: "Select a channel",
		},
		createChannel: {
			title: "Channel Settings",
			nameInputLabel: "Channel Name",
			nameInputPlaceholder: "server-status",
		},
		channelActions: {
			createChannel: "Create Channel",
			selectChannel: "Select Channel",
		},
		regionSelect: {
			placeholder: "Select one or more regions",
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
		selectChannel: "Select the channel you want status notification to go to",
		channelSelected:
			"You selected <#{{channelId}}> channel, finishing setup...",
		creatingChannel: "Creating channel...",
		channelCreated:
			"Successfully created <#{{channelId}}> channel, finishing setup...",
		channelActionChoice: "Where would you like the status notifications to go?",
		regionSelect: "Choose which regions you want status notifications for",
		cantSendMessages:
			"The bot does not have permission to send messages in the selected channel",
	},
} as const;
