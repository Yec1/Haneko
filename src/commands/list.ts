import {
	ChatInputCommandInteraction,
	SlashCommandBuilder,
	EmbedBuilder,
	Client,
	MessageFlags
} from "discord.js";
import { getLists, getListEmbed, getListComponents } from "../services/book.js";
import { database } from "../index.js";

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
	 * @param {ChatInputCommandInteraction} interaction
	 * @param {String[]} args
	 */
	async execute(
		client: Client,
		interaction: ChatInputCommandInteraction,
		args: string[],
		tr: (key: string) => string
	): Promise<void> {
		const category = interaction.options.getString("category");
		const visible = interaction.options.getBoolean("visible") ?? false;
		let userdb = await database.get(`${interaction.user.id}.${category}`);

		if (!userdb || userdb.length === 0) {
			await interaction.reply({
				embeds: [
					new EmbedBuilder()
						.setTitle(tr("list_empty"))
						.setColor("#E06469")
				],
				flags: MessageFlags.Ephemeral
			});
			return;
		}

		const currentPage = 0;
		const { totalPages } = getLists(userdb);
		await database.set(`${interaction.user.id}.list`, {
			currentPage: currentPage
		});

		await interaction.reply({
			embeds: [
				getListEmbed(
					tr,
					interaction,
					category!,
					totalPages,
					currentPage
				)
			],
			components: getListComponents(
				tr,
				interaction.user.id,
				totalPages,
				currentPage,
				category!
			) as any,

			flags: !visible ? MessageFlags.Ephemeral : undefined
		});
	}
};
