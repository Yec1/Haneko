import { client } from "../index.js";
import { WebhookClient, EmbedBuilder } from "discord.js";
import { Logger } from "../services/logger.js";

const webhook = new WebhookClient({
	url: process.env.ERRWEBHOOK
});

client.on("error", error => {
	console.log(error);
	webhook.send({
		embeds: [
			new EmbedBuilder().setTimestamp().setDescription(`${error.message}`)
		]
	});
	new Logger("系統").error(`錯誤訊息：${error.message}`);
});

client.on("warn", error => {
	new Logger("系統").warn(`警告訊息：${error.message}`);
});

process.on("unhandledRejection", error => {
	console.log(error);
	webhook.send({
		embeds: [
			new EmbedBuilder().setTimestamp().setDescription(`${error.message}`)
		]
	});
	new Logger("系統").error(`錯誤訊息：${error.message}`);
});

process.on("uncaughtException", console.error);
