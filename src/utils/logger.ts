import pino from "pino";
import { config } from "#src/utils/config.ts";
import { env } from "#src/utils/env.ts";

const targets: pino.TransportTargetOptions[] = [];

if (env.AXIOM_TOKEN) {
	targets.push({
		level: "info",
		target: "@axiomhq/pino",
		options: {
			token: env.AXIOM_TOKEN,
			orgId: env.AXIOM_ORG_ID,
			dataset: env.AXIOM_DATASET,
		},
	});
}

if (env.PINO_PRETTY === "true") {
	targets.push({
		target: "pino-pretty",
		options: {
			colorize: true,
		},
	});
}

export const logger = pino(
	{
		level: config.logLevel,
		timestamp: () => `,"timestamp":"${new Date(Date.now()).toISOString()}"`,
	},
	targets.length > 0 && pino.transport({ targets: targets }),
);
