import i18next from "i18next";
import { common as enCommon } from "~/locales/en/common";
import { system as enSystem } from "~/locales/en/system";
import { commands as enCommands } from "~/locales/en/commands";

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
