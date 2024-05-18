import {
	CommandInteraction,
	SlashCommandBuilder,
	EmbedBuilder
} from "discord.js";
import { getLists, getListEmbed, getListComponents } from "../services/book.js";

export default {
	data: new SlashCommandBuilder()
		.setName("list")
		.setNameLocalizations({
			"zh-TW": "列表"
		})
		.setDescription("...")
		.addStringOption(option =>
			option
				.setName("category")
				.setNameLocalizations({
					"zh-TW": "種類"
				})
				.setDescription("...")
				.setRequired(true)
				.addChoices(
					{
						name: "🕓Watch Later",
						name_localizations: {
							"zh-TW": "🕓稍後觀看"
						},
						value: "watchlater"
					},
					{
						name: "💖Favorites",
						name_localizations: {
							"zh-TW": "💖收藏"
						},
						value: "favorite"
					}
				)
		)
		.addBooleanOption(option =>
			option
				.setName("visible")
				.setNameLocalizations({
					"zh-TW": "其他人可見"
				})
				.setDescription("...")
				.setRequired(false)
		),

	/**
	 *
	 * @param {Client} client
	 * @param {CommandInteraction} interaction
	 * @param {String[]} args
	 */
	async execute(client, interaction, args, tr, db) {
		const category = interaction.options.getString("category");
		const visible = interaction.options.getBoolean("visible") ?? false;
		let userdb = await db.get(`${interaction.user.id}.${category}`);

		if (!userdb || userdb.length === 0) {
			return interaction.reply({
				embeds: [
					new EmbedBuilder()
						.setTitle(tr("list_empty"))
						.setColor("#E06469")
				],
				ephemeral: true
			});
		}

		const currentPage = 0;
		const { totalPages } = getLists(userdb);
		await db.set(`${interaction.user.id}.list`, {
			currentPage: currentPage
		});

		interaction.reply({
			embeds: [
				getListEmbed(tr, interaction, category, totalPages, currentPage)
			],
			components: getListComponents(
				tr,
				interaction.user.id,
				totalPages,
				currentPage,
				category
			),

			ephemeral: !visible
		});
	}
};
