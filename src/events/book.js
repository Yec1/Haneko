import { client } from "../index.js";
import {
	getBookPage,
	getBookComponents,
	getShelfBook,
	getShelfComponents,
	openBook,
	getLists,
	getListEmbed,
	getListComponents
} from "../services/book.js";
import { EmbedBuilder, ActionRowBuilder } from "discord.js";
import { i18nMixin, toI18nLang } from "../services/i18n.js";
import { NHentai } from "@shineiichijo/nhentai-ts";
const nhentai = new NHentai();
const db = client.db;

client.on("interactionCreate", async interaction => {
	const tr = i18nMixin(toI18nLang(interaction.locale) || "en");
	if (interaction.isButton()) {
		await interaction.deferUpdate().catch(() => {});
		const { customId } = interaction;

		if (
			customId.startsWith("shelf") ||
			customId.startsWith("watchlater") ||
			customId.startsWith("favorite")
		) {
			const shelfDB = await db.get(`${interaction.user.id}.shelf`);
			const isShelfBackD = customId.startsWith("shelfBackD-");
			const isShelfNextD = customId.startsWith("shelfNextD-");
			const isShelfBack = customId.startsWith("shelfBack-");
			const isShelfNext = customId.startsWith("shelfNext-");
			const isWatchlater = customId.startsWith("watchlater");
			const isFavorite = customId.startsWith("favorite");

			let shelfPage = shelfDB.currentPage;
			let shelfIndex = shelfDB.currentIndex;

			if (isShelfBackD || isShelfNextD) {
				shelfPage = isShelfBackD
					? shelfPage - 1 < 1
						? shelfDB.totalPages
						: shelfPage - 1
					: shelfPage + 1 > shelfDB.totalPages
						? 1
						: shelfPage + 1;
				shelfIndex = 1;
				await db.set(
					`${interaction.user.id}.shelf.currentPage`,
					shelfPage
				);
			}

			if (isShelfBack) {
				shelfIndex =
					shelfIndex - 1 < 1
						? shelfDB.totalCurrentData
						: shelfIndex - 1;
			}

			if (isShelfNext) {
				shelfIndex += 1;
				if (shelfIndex > shelfDB.totalCurrentData) {
					shelfPage += 1;
					shelfIndex = 1;
					if (shelfPage > shelfDB.totalPages) shelfPage = 1;
				}
			}

			const filter = shelfDB.filter;
			let searchFunction;
			switch (filter) {
				case "tag":
					searchFunction = nhentai.searchWithTag;
					break;
				case "artist":
					searchFunction = nhentai.searchWithArtist;
					break;
				case "character":
					searchFunction = nhentai.searchWithCharacter;
					break;
				case "parodies":
					searchFunction = nhentai.searchWithParody;
					break;
				default:
					searchFunction = nhentai.search;
			}

			const res =
				shelfDB.name != null
					? await searchFunction(shelfDB.name, {
							page: parseInt(shelfPage)
						})
					: await nhentai.explore(parseInt(shelfPage));
			console.log(shelfIndex);
			if (isShelfBackD || isShelfNextD)
				await db.set(
					`${interaction.user.id}.shelf.totalCurrentData`,
					res.data.length
				);
			await db.set(
				`${interaction.user.id}.shelf.currentBookId`,
				res.data[shelfIndex - 1].id
			);
			await db.set(
				`${interaction.user.id}.shelf.currentBookTitle`,
				res.data[shelfIndex - 1].title
			);

			if (isWatchlater || isFavorite) {
				const shelfDB = await db.get(`${interaction.user.id}.shelf`);
				const option = isWatchlater ? "watchlater" : "favorite";
				await saveUserOptions(
					interaction.user.id,
					option,
					shelfDB.currentBookId,
					shelfDB.currentBookTitle
				);
			} else
				await db.set(
					`${interaction.user.id}.shelf.currentIndex`,
					shelfIndex
				);

			if (customId.startsWith("shelfCheck"))
				return interaction.message.edit(
					await openBook(
						tr,
						interaction,
						await nhentai.getDoujin(res.data[shelfIndex - 1].id)
					)
				);

			const {
				backD,
				back,
				page,
				next,
				nextD,
				check,
				watchlaterOff,
				watchlaterOn,
				favoriteOff,
				favoriteOn
			} = getShelfComponents(tr, interaction.user.id, shelfIndex, res);

			const userdb = (await db.get(interaction.user.id)) || {};
			return interaction.message.edit({
				embeds: [getShelfBook(res.data[shelfIndex - 1])],
				components: [
					new ActionRowBuilder().addComponents(
						backD,
						back,
						page,
						next,
						nextD
					),
					new ActionRowBuilder().addComponents(
						check,
						userdb?.watchlater?.some(
							item => item.id === res.data[shelfIndex - 1].id
						)
							? watchlaterOn
							: watchlaterOff,
						userdb?.favorite?.some(
							item => item.id === res.data[shelfIndex - 1].id
						)
							? favoriteOn
							: favoriteOff
					)
				]
			});
		} else if (customId.startsWith("list")) {
			const isListBack = customId.startsWith("listBack-");
			const isListNext = customId.startsWith("listNext-");
			const isListRefresh = customId.startsWith("listRefresh-");

			if (isListBack || isListNext || isListRefresh) {
				const category = customId.split("-")[1];
				const userId = customId.split("-")[2];
				const userdb = await db.get(`${userId}.${category}`);

				if (!userdb || userdb.length === 0) {
					return interaction
						.editReply({
							embeds: [
								new EmbedBuilder()
									.setTitle(tr("list_empty"))
									.setColor("#E06469")
							],
							components: [],
							ephemeral: true
						})
						.catch(() => {});
				}

				const listDB = await db.get(`${userId}.list`);
				let currentPage = listDB.currentPage;
				const { totalPages } = getLists(userdb);

				currentPage = isListBack
					? (currentPage - 1 + totalPages.length) % totalPages.length
					: (currentPage + 1) % totalPages.length;

				await db.set(`${interaction.user.id}.list`, {
					currentPage: currentPage
				});

				return interaction
					.editReply({
						embeds: [
							getListEmbed(
								tr,
								interaction,
								category,
								totalPages,
								currentPage
							)
						],
						components: getListComponents(
							tr,
							interaction.user.id,
							totalPages,
							currentPage,
							category
						)
					})
					.catch(() => {});
			}
		} else {
			const ownerId = customId.match(/-(\d+)$/)[1];
			const userId = interaction.user.id;
			const teamPath = `${ownerId}.team`;

			let id = userId;
			if (await db.has(teamPath)) {
				const team = await client.db.get(teamPath);
				if (team.length > 0) id = userId === ownerId ? userId : ownerId;
			}

			if (!customId.endsWith(id)) {
				return interaction.followUp({
					embeds: [
						new EmbedBuilder()
							.setThumbnail(
								"https://media.discordapp.net/attachments/1057244827688910850/1110552508369219584/discord_1.gif"
							)
							.setTitle(tr("book_onlyself"))
							.setColor("#E06469")
					],
					ephemeral: true
				});
			}

			const book = await db.get(`${ownerId}.book`);
			let page = book.currentPage ?? 0;
			const isBookBack = customId.startsWith("bookBack-");
			const isBookNext = customId.startsWith("bookNext-");

			if (isBookBack || isBookNext) {
				page = isBookBack
					? page - 1 < 1
						? book.totalPages
						: page - 1
					: page + 1 > book.totalPages
						? 1
						: page + 1;
				await db.set(`${ownerId}.book.currentPage`, page);
			}
			const { cmdMenu, tagMenu, bookBack, bookPage, bookNext } =
				await getBookComponents(
					tr,
					ownerId,
					await db.get(`${ownerId}.book`)
				);

			return interaction.message.edit({
				embeds: [getBookPage(book, page)],
				components: [
					new ActionRowBuilder().addComponents(
						bookBack,
						bookPage,
						bookNext
					),
					new ActionRowBuilder().addComponents(cmdMenu),
					new ActionRowBuilder().addComponents(tagMenu)
				]
			});
		}
	} else if (interaction.isStringSelectMenu()) {
		await interaction.deferUpdate().catch(() => {});
		const customId = interaction.values[0];
		if (customId.startsWith("tag")) return;
		const isBookOpen = customId.startsWith("bookOpen-");
		const isBookStop = customId.startsWith("bookStop-");
		const isBookWatchlater = customId.startsWith("bookWatchlater-");
		const isBookFavorite = customId.startsWith("bookFavorite-");
		const islistRemove = customId.startsWith("listRemove-");
		const islistOpen = customId.startsWith("listOpen-");
		const ownerId = customId.match(/-(\d+)$/)[1];
		const book = await db.get(`${ownerId}.book`);

		if (isBookOpen) {
			const { cmdMenu, tagMenu, bookBack, bookPage, bookNext } =
				await getBookComponents(
					tr,
					ownerId,
					await db.get(`${ownerId}.book`)
				);
			return interaction.message.edit({
				embeds: [getBookPage(book, page)],
				components: [
					new ActionRowBuilder().addComponents(
						bookBack,
						bookPage,
						bookNext
					),
					new ActionRowBuilder().addComponents(cmdMenu),
					new ActionRowBuilder().addComponents(tagMenu)
				]
			});
		} else if (isBookStop) {
			await db.delete(`${ownerId}.book`);
			return interaction.message.delete();
		} else if (isBookWatchlater || isBookFavorite) {
			let option = customId.split("book")[1];
			option = option.split("-")[0].toLowerCase();

			await saveUserOptions(
				interaction.user.id,
				option,
				book.id,
				book.title
			);

			const { cmdMenu, tagMenu, bookBack, bookPage, bookNext } =
				await getBookComponents(
					tr,
					ownerId,
					await db.get(`${ownerId}.book`)
				);

			return interaction.message.edit({
				components: [
					new ActionRowBuilder().addComponents(
						bookBack,
						bookPage,
						bookNext
					),
					new ActionRowBuilder().addComponents(cmdMenu),
					new ActionRowBuilder().addComponents(tagMenu)
				]
			});
		} else if (islistRemove) {
			const ownerId = customId.split("-")[1];

			if (ownerId != interaction.user.id)
				return interaction.followUp({
					embeds: [
						new EmbedBuilder()
							.setDescription(
								`## ${tr("list_removeOtherFailed")}`
							)
							.setThumbnail(
								"https://media.discordapp.net/attachments/1057244827688910850/1110552508369219584/discord_1.gif"
							)
							.setColor("#E06469")
					],
					ephemeral: true
				});

			const category = customId.split("-")[2];
			const index = customId.split("-")[3];
			const userdb = await db.get(`${ownerId}.${category}`);
			const bookTitle = userdb[index].title;

			userdb.splice(index, 1);
			await db.set(`${ownerId}.${category}`, userdb);

			interaction.followUp({
				embeds: [
					new EmbedBuilder()
						.setDescription(
							`## ${tr("list_removeSuccess", {
								category: tr(category),
								book: bookTitle
							})}`
						)
						.setThumbnail(
							"https://media.discordapp.net/attachments/1057244827688910850/1110552199450333204/discord.gif"
						)
						.setColor("#A4D0A4")
				],
				ephemeral: true
			});
		} else if (islistOpen) {
			const ownerId = customId.split("-")[1];
			const category = customId.split("-")[2];
			const index = customId.split("-")[3];
			const userdb = await db.get(`${ownerId}.${category}`);
			const id = userdb[index].id;

			const book = await nhentai.getDoujin(id);
			interaction.followUp(await openBook(tr, interaction, book));
		}
	}
});

async function saveUserOptions(userid, option, id, title) {
	const userdb = (await db.get(`${userid}`)) || {};
	if (!userdb[option]) userdb[option] = [];

	const index = userdb[option].findIndex(item => item.id === id);

	if (index !== -1) {
		userdb[option].splice(index, 1);
		await db.set(`${userid}.${option}`, userdb[option]);
	} else {
		await db.push(`${userid}.${option}`, {
			id: id,
			title: title,
			addTime: Math.floor(new Date().getTime() / 1000)
		});
	}
}
