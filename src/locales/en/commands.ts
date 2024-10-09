import { lookup } from "#src/locales/en/commands/lookup.ts";
import { managers } from "#src/locales/en/commands/managers.ts";
import { serverStatus } from "#src/locales/en/commands/server-status.ts";
import { utc } from "#src/locales/en/commands/utc.ts";

export const commands = {
	utc,
	lookup,
	managers,
	serverStatus,
} as const;
