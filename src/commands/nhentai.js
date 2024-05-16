import {
	CommandInteraction,
	SlashCommandBuilder,
	EmbedBuilder,
	ChannelType
} from "discord.js";
import { NHentai } from "@shineiichijo/nhentai-ts";
import { openBook, openBookShelf } from "../services/book.js";
const nhentai = new NHentai();

export default {
	data: new SlashCommandBuilder()
		.setName("nhentai")
		.setDescription("...")
		.addSubcommand(subcommand =>
			subcommand
				.setName("random")
				.setDescription("...")
				.setNameLocalizations({
					"zh-TW": "隨機"
				})
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName("search")
				.setDescription("...")
				.setNameLocalizations({
					"zh-TW": "搜尋"
				})
				.addStringOption(option =>
					option
						.setName("query")
						.setDescription("...")
						.setRequired(true)
				)
				.addStringOption(option =>
					option
						.setName("filter")
						.setNameLocalizations({
							"zh-TW": "篩選"
						})
						.setDescription("...")
						.setRequired(false)
						.addChoices(
							{
								name: "tag",
								name_localizations: {
									"zh-TW": "標籤"
								},
								value: "tag"
							},
							{
								name: "artist",
								name_localizations: {
									"zh-TW": "作者"
								},
								value: "artist"
							},
							{
								name: "character",
								name_localizations: {
									"zh-TW": "角色"
								},
								value: "character"
							},
							{
								name: "parodies",
								name_localizations: {
									"zh-TW": "作品"
								},
								value: "parodies"
							}
						)
				)
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName("get")
				.setDescription("...")
				.setNameLocalizations({
					"zh-TW": "指定"
				})
				.addStringOption(option =>
					option
						.setName("query")
						.setDescription("...")
						.setRequired(true)
				)
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName("explore")
				.setDescription("...")
				.setNameLocalizations({
					"zh-TW": "探索"
				})
		),
	/**
	 *
	 * @param {Client} client
	 * @param {CommandInteraction} interaction
	 * @param {String[]} args
	 */
	async execute(client, interaction, args, tr, db) {
		const cmd = interaction.options.getSubcommand();
		if (
			interaction.channel.type == ChannelType.PrivateThread ||
			interaction.channel.type == ChannelType.PublicThread
				? interaction.channel.parent.nsfw == false
				: interaction.channel.nsfw == false &&
					(await db.get(`${interaction.guild.id}.nonNSFW`)) != true
		)
			return interaction.reply({
				embeds: [
					new EmbedBuilder()
						.setThumbnail(
							"https://media.discordapp.net/attachments/1057244827688910850/1110552508369219584/discord_1.gif"
						)
						.setTitle(tr("notNsfw"))
						.setColor("#E06469")
				],
				ephemeral: true
			});

		await interaction.deferReply();
		interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setThumbnail(
						"https://media.discordapp.net/attachments/1057244827688910850/1112383837717155850/Paw.gif"
					)
					.setTitle(tr("Searching"))
					.setColor("#9DB2BF")
			]
		});

		if (cmd === "random") {
			interaction.editReply(
				await openBook(tr, interaction, await nhentai.getRandom())
			);
		} else if (cmd == "get") {
			const id = interaction.options.getString("query");
			try {
				const book = await nhentai.getDoujin(id);
				interaction.editReply(await openBook(tr, interaction, book));
			} catch (error) {
				return interaction.editReply({
					embeds: [
						new EmbedBuilder()
							.setThumbnail(
								"https://media.discordapp.net/attachments/1057244827688910850/1110567165637185697/discord_2.gif"
							)
							.setTitle(tr("NofoundBook"))
							.setDescription(`${error.message}`)
							.setColor("#E06469")
					]
				});
			}
		} else if (cmd === "search") {
			const filter = interaction.options.getString("filter") || null;
			const query = interaction.options
				.getString("query")
				.replace(" ", "-");
			let res;
			try {
				res =
					filter == "tag"
						? await nhentai.searchWithTag(query)
						: filter == "artist"
							? await nhentai.searchWithArtist(query)
							: filter == "character"
								? await nhentai.searchWithCharacter(query)
								: filter == "parodies"
									? await nhentai.searchWithParody(query)
									: await nhentai.search(query);
			} catch (error) {
				console.log(error);
				return interaction.editReply({
					embeds: [
						new EmbedBuilder()
							.setThumbnail(
								"https://media.discordapp.net/attachments/1057244827688910850/1110567165637185697/discord_2.gif"
							)
							.setDescription(`${error.message}`)
							.setTitle(tr("NofoundRes"))
							.setColor("#E06469")
					]
				});
			}
			interaction.editReply(
				await openBookShelf(tr, interaction, res, cmd, filter, query)
			);
		} else if (cmd == "explore") {
			interaction.editReply(
				await openBookShelf(
					tr,
					interaction,
					await nhentai.explore(),
					"explore"
				)
			);
		}
	}
};
