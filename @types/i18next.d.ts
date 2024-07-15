import { resources, defaultNS } from "../src/utils/i18n";

declare module "i18next" {
	interface CustomTypeOptions {
		defaultNS: typeof defaultNS;
		resources: (typeof resources)["en"];
	}
}
