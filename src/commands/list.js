import {
	CommandInteraction,
	SlashCommandBuilder,
	EmbedBuilder
} from "discord.js";

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
						name: "Watch Later",
						name_localizations: {
							"zh-TW": "稍後觀看"
						},
						value: "watchlater"
					},
					{
						name: "Favorites",
						name_localizations: {
							"zh-TW": "收藏"
						},
						value: "favorite"
					}
				)
		),

	/**
	 *
	 * @param {Client} client
	 * @param {CommandInteraction} interaction
	 * @param {String[]} args
	 */
	async execute(client, interaction, args, tr, db) {
		const category = interaction.options.getString("category");
		const userdb = await db.get(`${interaction.user.id}.${category}`);

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

		interaction.reply({
			embeds: [
				new EmbedBuilder()
					.setTitle(tr("list_title", { z: tr(category) }))
					.setThumbnail(
						interaction.user.displayAvatarURL({
							size: 4096,
							dynamic: true
						})
					)
					.setDescription(
						userdb
							.map((book, i) => {
								return `\`${i + 1}\` ▪ \`${book.id}\` - ${book.title}`;
							})
							.join("\n")
					)
					.setColor("#A4D0A4")
			],
			ephemeral: true
		});
	}
};
