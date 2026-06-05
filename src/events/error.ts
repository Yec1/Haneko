import { Events, WebhookClient, EmbedBuilder } from "discord.js";
import type { Event } from "../interfaces/Event.js";
import { Logger } from "../utils/Logger.js";

const logger = new Logger("系統");

const webhook = process.env.ERRWEBHOOK
  ? new WebhookClient({ url: process.env.ERRWEBHOOK })
  : null;

function sendError(error: Error) {
  logger.error(`錯誤訊息：${error.message}`);
  webhook?.send({
    embeds: [new EmbedBuilder().setTimestamp().setDescription(`${error.message ?? String(error)}`)],
  }).catch(() => {});
}

process.on("unhandledRejection", (error: any) => sendError(error));
process.on("uncaughtException", (error: Error) => sendError(error));

export default {
  name: Events.Error,
  once: false,
  async execute(error: Error) {
    sendError(error);
    logger.warn(`Client error: ${error.message}`);
  },
} satisfies Event;
