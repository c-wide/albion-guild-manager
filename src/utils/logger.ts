import pino from "pino";
import { env } from "~/utils/env";

const targets: pino.TransportTargetOptions[] = [];

if (env.AXIOM_TOKEN) {
	targets.push({
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
		level: "info",
		timestamp: () => `,"timestamp":"${new Date(Date.now()).toISOString()}"`,
	},
	targets.length > 0 && pino.transport({ targets: targets }),
);
