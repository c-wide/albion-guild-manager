import i18next from "i18next";
import { common as enCommon } from "~/locales/en/common";

export const defaultNS = "common";

export const resources = {
	en: {
		common: enCommon,
	},
} as const;

i18next.init({
	lng: "en",
	fallbackLng: "en",
	defaultNS,
	resources: resources,
});

export default i18next;
