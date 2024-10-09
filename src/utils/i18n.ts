import i18next from "i18next";
import { commands as enCommands } from "#src/locales/en/commands.ts";
import { common as enCommon } from "#src/locales/en/common.ts";
import { system as enSystem } from "#src/locales/en/system.ts";

export const defaultNS = "common";

export const resources = {
	en: {
		common: enCommon,
		system: enSystem,
		commands: enCommands,
	},
} as const;

i18next.init({
	lng: "en",
	fallbackLng: "en",
	defaultNS,
	ns: ["common", "system", "commands"],
	resources: resources,
});

export default i18next;
