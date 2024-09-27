import {
	CommandInteraction,
	SlashCommandBuilder,
	EmbedBuilder,
	ChannelType
} from "discord.js";
import { NHentai } from "@shineiichijo/nhentai-ts";
import { openBook, openBookShelf } from "../services/book.js";
const nhentai = new NHentai({
	site: "nhentai.net",
	user_agent: process.env.USER_AGENT,
	cookie_value: process.env.COOKIE
});

export default {
	data: new SlashCommandBuilder()
		.setName("clear")
		.setDescription(
			"If you are unable to turn the page, you can use this command"
		)
		.setDescriptionLocalizations({
			"zh-TW": "如果你一直遇到無法翻頁可以使用這個指令"
		}),

	/**
	 *
	 * @param {Client} client
	 * @param {CommandInteraction} interaction
	 * @param {String[]} args
	 */
	async execute(client, interaction, args, tr, db) {
		await db.delete(`${interaction.user.id}`);
		interaction.reply({
			embeds: [new EmbedBuilder.setTitle("Done!")]
		});
	}
};
