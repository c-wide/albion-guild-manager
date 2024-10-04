import { lookup } from "~/locales/en/commands/lookup";
import { managers } from "~/locales/en/commands/managers";
import { serverStatus } from "~/locales/en/commands/server-status";
import { utc } from "~/locales/en/commands/utc";

export const commands = {
	utc,
	lookup,
	managers,
	serverStatus,
} as const;
