export const serverStatus = {
	name: "serverstatus",
	desc: "Configure Albion Online server status notifications",
	subcommands: {
		enable: {
			name: "enable",
			desc: "Turn on status notifications",
		},
		disable: {
			name: "disable",
			desc: "Turn off status notifications",
		},
		setup: {
			name: "setup",
			desc: "Start an interactive setup process for status notifications",
		},
	},
	embeds: {
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
		notificationsAlreadyEnabled: "Status notifications are already on",
		channelNotConfigured: "Set a notification channel before enabling",
		noRegionsTracked: "Add a region to track before enabling notifications",
		notificationsEnabled: "Status notifications turned on",
		notificationsAlreadyDisabled: "Status notifications are already off",
		notificationsDisabled: "Status notifications turned off",
		selectChannel: "Select the channel you want status notification to go to",
		channelSelected:
			"You selected <#{{channelId}}> channel, finishing setup...",
		creatingChannel: "Creating channel...",
		channelCreated:
			"Successfully created <#{{channelId}}> channel, finishing setup...",
		channelActionChoice: "Where would you like the status notifications to go?",
		regionSelect: "Choose which regions you want status notifications for",
		cantSendMessages:
			"Bot lacks permission to view and send messages in the selected channel",
	},
} as const;
