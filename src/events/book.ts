import { client, database, nhentai } from "../index.js";
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
import {
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	StringSelectMenuBuilder,
	Interaction,
	ButtonInteraction,
	StringSelectMenuInteraction,
	MessageFlags
} from "discord.js";
import { createTranslator } from "../services/i18n.js";
import Queue from "queue";
const downloadQueue = new Queue({ autostart: true });

client.on("interactionCreate", async (interaction: Interaction) => {
	const tr = createTranslator(interaction.locale || "en");
	if (interaction.isButton()) {
		await (interaction as ButtonInteraction).deferUpdate().catch(() => {});
		const { customId } = interaction;

		if (
			customId.startsWith("shelf") ||
			customId.startsWith("watchlater") ||
			customId.startsWith("favorite")
		) {
			const ownerId = customId.match(/-(\d+)$/)?.[1];
			if (!ownerId) return;

			let shelfDB =
				ownerId == interaction.user.id
					? await database.get(`${interaction.user.id}.shelf`)
					: await database.get(`${ownerId}.shelf`);

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
				await database.set(
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
			let searchFunction: any;
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

			if (isShelfBackD || isShelfNextD)
				await database.set(
					`${interaction.user.id}.shelf.totalCurrentData`,
					res.data.length
				);
			await database.set(
				`${interaction.user.id}.shelf.currentBookId`,
				res.data[shelfIndex - 1].id
			);
			await database.set(
				`${interaction.user.id}.shelf.currentBookTitle`,
				res.data[shelfIndex - 1].title
			);

			if (isWatchlater || isFavorite) {
				const userdb = (await database.get(interaction.user.id)) || {};
				const option = isWatchlater ? "watchlater" : "favorite";

				await interaction.followUp({
					content: userdb[option]?.some(
						(item: any) => item.id === res.data[shelfIndex - 1].id
					)
						? tr("remove_success", {
								book: res.data[shelfIndex - 1].title,
								option: tr(option)
							})
						: tr("save_success", {
								book: res.data[shelfIndex - 1].title,
								option: tr(option)
							}),
					flags: MessageFlags.Ephemeral
				});

				await saveUserOptions(
					interaction.user.id,
					option,
					res.data[shelfIndex - 1].id,
					res.data[shelfIndex - 1].title
				);
			} else
				await database.set(`${ownerId}.shelf.currentIndex`, shelfIndex);

			if (customId.startsWith("shelfCheck"))
				return interaction.message?.edit(
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

			const userdb = (await database.get(interaction.user.id)) || {};
			return interaction.message?.edit({
				embeds: [getShelfBook(res.data[shelfIndex - 1])],
				components: [
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						backD,
						back,
						page,
						next,
						nextD
					),
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						check,
						userdb?.watchlater?.some(
							(item: any) =>
								item.id === res.data[shelfIndex - 1].id
						)
							? watchlaterOn
							: watchlaterOff,
						userdb?.favorite?.some(
							(item: any) =>
								item.id === res.data[shelfIndex - 1].id
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
				const userdb = await database.get(`${userId}.${category}`);

				if (!userdb || userdb.length === 0) {
					return interaction
						.editReply({
							embeds: [
								new EmbedBuilder()
									.setTitle(tr("list_empty"))
									.setColor("#E06469")
							],
							components: []
						})
						.catch(() => {});
				}

				const listDB = await database.get(`${userId}.list`);
				let currentPage = listDB.currentPage;
				const { totalPages } = getLists(userdb);

				if (isListRefresh) {
					currentPage = isListBack
						? (currentPage - 1 + totalPages.length) %
							totalPages.length
						: (currentPage + 1) % totalPages.length;

					await database.set(`${interaction.user.id}.list`, {
						currentPage: currentPage
					});
				}

				return interaction
					.editReply({
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
						) as any
					})
					.catch(() => {});
			}
		} else {
			const ownerId = customId.match(/-(\d+)$/)?.[1];
			if (!ownerId) return;

			const userId = interaction.user.id;
			const teamPath = `${ownerId}.team`;

			let id = userId;
			if (await database.has(teamPath)) {
				const team = await database.get(teamPath);
				if (team.length > 0) id = userId === ownerId ? userId : ownerId;
			}

			if (!customId.endsWith(id)) {
				return await interaction.followUp({
					embeds: [
						new EmbedBuilder()
							.setThumbnail(
								"https://media.discordapp.net/attachments/1057244827688910850/1110552508369219584/discord_1.gif"
							)
							.setTitle(tr("book_onlyself"))
							.setColor("#E06469")
					],
					flags: MessageFlags.Ephemeral
				});
			}

			const book = await database.get(`${ownerId}.book`);
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
				await database.set(`${ownerId}.book.currentPage`, page);
			}
			const bookData = await database.get(`${ownerId}.book`);
			if (!bookData) return;

			const { cmdMenu, tagMenu, bookBack, bookPage, bookNext } =
				await getBookComponents(tr, ownerId, bookData);

			return interaction.message?.edit({
				embeds: [getBookPage(book, page)],
				components: [
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						bookBack,
						bookPage,
						bookNext
					),
					new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
						cmdMenu
					),
					new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
						tagMenu
					)
				]
			});
		}
	} else if (interaction.isStringSelectMenu()) {
		await (interaction as StringSelectMenuInteraction)
			.deferUpdate()
			.catch(() => {});

		const customId = interaction.values[0];
		if (!customId || customId.startsWith("tag")) return;
		const isDownload = customId.startsWith("download");
		const isBookOpen = customId.startsWith("bookOpen-");
		const isBookStop = customId.startsWith("bookStop-");
		const isBookWatchlater = customId.startsWith("bookWatchlater-");
		const isBookFavorite = customId.startsWith("bookFavorite-");
		const islistRemove = customId.startsWith("listRemove-");
		const islistOpen = customId.startsWith("listOpen-");
		const ownerId = customId.match(/-(\d+)$/)?.[1];
		if (!ownerId) return;

		const book = await database.get(`${ownerId}.book`);

		if (isBookOpen) {
			const { cmdMenu, tagMenu, bookBack, bookPage, bookNext } =
				await getBookComponents(
					tr,
					ownerId,
					(await database.get(`${ownerId}.book`)) || book
				);
			return interaction.message?.edit({
				embeds: [getBookPage(book, book.currentPage || 1)],
				components: [
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						bookBack,
						bookPage,
						bookNext
					),
					new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
						cmdMenu
					),
					new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
						tagMenu
					)
				]
			});
		} else if (isBookStop) {
			await database.delete(`${ownerId}.book`);
			return interaction.message?.delete();
		} else if (isBookWatchlater || isBookFavorite) {
			let option = customId.split("book")[1];
			if (option) option = option.split("-")[0]?.toLowerCase();

			await saveUserOptions(
				interaction.user.id,
				option!,
				book.id,
				book.title
			);

			const { cmdMenu, tagMenu, bookBack, bookPage, bookNext } =
				await getBookComponents(
					tr,
					ownerId,
					(await database.get(`${ownerId}.book`)) || book
				);

			return interaction.message?.edit({
				components: [
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						bookBack,
						bookPage,
						bookNext
					),
					new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
						cmdMenu
					),
					new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
						tagMenu
					)
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
					flags: MessageFlags.Ephemeral
				});

			const category = customId.split("-")[2];
			const index = customId.split("-")[3];
			if (category && index) {
				const userdb = await database.get(`${ownerId}.${category}`);
				const bookTitle = userdb[parseInt(index)]?.title;

				userdb.splice(parseInt(index), 1);
				await database.set(`${ownerId}.${category}`, userdb);

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
					flags: MessageFlags.Ephemeral
				});
			}
		} else if (islistOpen) {
			const ownerId = customId.split("-")[1];
			const category = customId.split("-")[2];
			const index = customId.split("-")[3];
			if (ownerId && category && index) {
				const userdb = await database.get(`${ownerId}.${category}`);
				const id = userdb[parseInt(index)]?.id;

				if (id) {
					const book = await nhentai.getDoujin(id);
					interaction.followUp(await openBook(tr, interaction, book));
				}
			}
		} else if (isDownload) {
			const downloadTask = async () => {
				try {
					const action = customId.split("download")[1]?.split("-")[0]; // downloadZip-123456 -> Zip
					const id = customId.split("download")[1]?.split("-")[1]; // downloadZip-123456 -> 123456

					if (action && id) {
						if (action === "Zip") {
							interaction.followUp({
								content: tr("downloding"),
								flags: MessageFlags.Ephemeral
							});
							const startTime = Date.now();
							const res = await nhentai.getDoujin(id);
							const zipBuffer = await res.images.zip();

							interaction.followUp({
								content:
									`<@${interaction.user.id}> ` +
									tr("downloded", {
										time: (
											(Date.now() - startTime) /
											1000
										).toString()
									}),
								files: [
									{
										attachment: zipBuffer,
										name: `${id}.zip`
									}
								],
								flags: MessageFlags.Ephemeral
							});
						} else if (action === "Pdf") {
							interaction.followUp({
								content: tr("downloding"),
								flags: MessageFlags.Ephemeral
							});
							const startTime = Date.now();
							const res = await nhentai.getDoujin(id);
							const pdfBuffer = await res.images.PDF();

							interaction.followUp({
								content:
									`<@${interaction.user.id}> ` +
									tr("downloded", {
										time: (
											(Date.now() - startTime) /
											1000
										).toString()
									}),
								files: [
									{
										attachment: pdfBuffer,
										name: `${id}.pdf`
									}
								],
								flags: MessageFlags.Ephemeral
							});
						}
					}
				} catch (error) {
					console.log(error);
				}
			};

			downloadQueue.push(downloadTask);

			if (downloadQueue.length !== 1) {
				interaction.followUp({
					content: tr("DownloadInQueue", {
						position: (downloadQueue.length - 1).toString()
					}),
					flags: MessageFlags.Ephemeral
				});
			}
		}
	}
});

async function saveUserOptions(
	userid: string,
	option: string,
	id: string,
	title: string
): Promise<void> {
	const userdb = (await database.get(`${userid}`)) || {};
	if (!userdb[option]) userdb[option] = [];

	const index = userdb[option].findIndex((item: any) => item.id === id);

	if (index !== -1) {
		userdb[option].splice(index, 1);
		await database.set(`${userid}.${option}`, userdb[option]);
	} else {
		await database.push(`${userid}.${option}`, {
			id: id,
			title: title,
			addTime: Math.floor(new Date().getTime() / 1000)
		});
	}
}
