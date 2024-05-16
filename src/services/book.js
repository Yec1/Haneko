import { client } from "../index.js";
import {
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	StringSelectMenuBuilder
} from "discord.js";
const db = client.db;

async function openBook(tr, interaction, book) {
	const parts = book.images.pages[0].split("/");
	const page = 1;
	const totalPages = book.images.pages.length;
	await db.set(`${interaction.user.id}.book`, {
		id: book.id,
		title: book.title ?? book.originalTitle,
		media_id: parts[parts.length - 2],
		parodies: book.parodies,
		charactersL: book.charactersL,
		tags: book.tags,
		artists: book.artists,
		groups: book.groups,
		languages: book.languages,
		categories: book.categories,
		totalPages: totalPages,
		type: parts[parts.length - 1].split(".")[1],
		url: `https://nhentai.net/g/${book.id}`,
		currentPage: page
	});

	const bookDB = await db.get(`${interaction.user.id}.book`);
	const { cmdMenu, tagMenu, bookBack, bookPage, bookNext } =
		getBookComponents(tr, interaction.user.id, bookDB);

	return {
		embeds: [getBookPage(bookDB, page)],
		components: [
			new ActionRowBuilder().addComponents(bookBack, bookPage, bookNext),
			new ActionRowBuilder().addComponents(cmdMenu),
			new ActionRowBuilder().addComponents(tagMenu)
		]
	};
}

async function openBookShelf(tr, interaction, res, type, filter, name) {
	const index = 1;
	const totalPages = res?.pagination.totalPages || 1;
	const currentPage = res?.pagination.currentPage || 1;

	const userdb = (await db.get(interaction.user.id)) || {};
	await db.set(`${interaction.user.id}.shelf`, {
		name: type == "search" ? name : null,
		filter: filter,
		currentBookId: res.data[index - 1].id,
		currentBookTitle: res.data[index - 1].title,
		currentIndex: index,
		currentPage: currentPage,
		totalPages: totalPages
	});

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
	} = getShelfComponents(tr, interaction.user.id, index, res);

	return {
		embeds: [getShelfBook(res.data[index - 1])],
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
					item => item.id === res.data[index - 1].id
				)
					? watchlaterOn
					: watchlaterOff,
				userdb?.favorite?.some(
					item => item.id === res.data[index - 1].id
				)
					? favoriteOn
					: favoriteOff
			)
		]
	};
}

function getShelfBook(book) {
	return new EmbedBuilder()
		.setColor("#FDCEDF")
		.setTitle(book.title)
		.setURL(`https://nhentai.net/g/${book.id}`)
		.setFooter({ text: `#${book.id}` })
		.setImage(book.cover);
}

function getBookPage(book, page) {
	return new EmbedBuilder()
		.setColor("#FDCEDF")
		.setTitle(book.title)
		.setURL(book.url)
		.setFooter({ text: `#${book.id}` })
		.setImage(
			`https://i.nhentai.net/galleries/${book.media_id}/${page}.${book.type}`
		);
}

function getShelfComponents(tr, id, index, res) {
	const currentPage = res.pagination.currentPage;
	const totalPages = res.pagination.totalPages;

	const backD = new ButtonBuilder()
		.setCustomId(`shelfBackD-${id}`)
		.setEmoji("⏪")
		.setStyle(ButtonStyle.Primary);

	const back = new ButtonBuilder()
		.setCustomId(`shelfBack-${id}`)
		.setEmoji("◀️")
		.setStyle(ButtonStyle.Primary);

	const page = new ButtonBuilder()
		.setCustomId(`shelfPage-${id}`)
		.setLabel(
			tr("shelfpage", {
				index: index,
				length: res.data.length,
				current: currentPage,
				total: totalPages
			})
		)
		.setStyle(ButtonStyle.Secondary)
		.setDisabled(true);

	const next = new ButtonBuilder()
		.setCustomId(`shelfNext-${id}`)
		.setEmoji("▶️")
		.setStyle(ButtonStyle.Primary);

	const nextD = new ButtonBuilder()
		.setCustomId(`shelfNextD-${id}`)
		.setEmoji("⏩")
		.setStyle(ButtonStyle.Primary);

	const check = new ButtonBuilder()
		.setCustomId(`shelfCheck-${id}`)
		.setLabel(tr("check"))
		.setEmoji("✅")
		.setStyle(ButtonStyle.Success);

	const watchlaterOff = new ButtonBuilder()
		.setCustomId(`watchlaterOff-${id}`)
		.setLabel(tr("watchlaterOff"))
		.setEmoji("🕓")
		.setStyle(ButtonStyle.Secondary);

	const watchlaterOn = new ButtonBuilder()
		.setCustomId(`watchlaterOn-${id}`)
		.setLabel(tr("watchlaterOn"))
		.setEmoji("🕓")
		.setStyle(ButtonStyle.Success);

	const favoriteOff = new ButtonBuilder()
		.setCustomId(`favoriteOff-${id}`)
		.setLabel(tr("favoriteOff"))
		.setEmoji("❤️")
		.setStyle(ButtonStyle.Secondary);

	const favoriteOn = new ButtonBuilder()
		.setCustomId(`favoriteOn-${id}`)
		.setLabel(tr("favoriteOn"))
		.setEmoji("❤️")
		.setStyle(ButtonStyle.Success);

	return {
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
	};
}

function getBookComponents(tr, id, book) {
	const cmdMenu = new StringSelectMenuBuilder()
		.setPlaceholder(tr("cmdMenu"))
		.setCustomId("book_selectMenu")
		.setMinValues(1)
		.setMaxValues(1)
		.addOptions({
			emoji: "🔒",
			label: tr("book_stop"),
			value: `bookStop-${id}`
		});

	const tagMenu = new StringSelectMenuBuilder()
		.setPlaceholder(tr("tagMenu"))
		.setCustomId("book_selectMenuTags")
		.setMinValues(1)
		.setMaxValues(1)
		.addOptions(
			{
				emoji: "👤",
				label: tr("artists"),
				description:
					book?.artists?.length >= 1
						? book.artists.join(", ").length > 100
							? book.artists.join(", ").substring(0, 97) + "..."
							: book.artists.join(", ")
						: tr("unknown"),
				value: "tag-artists"
			},
			{
				emoji: "👥",
				label: tr("groups"),
				description:
					book?.groups?.length >= 1
						? book.groups.join(", ").length > 100
							? book.groups.join(", ").substring(0, 97) + "..."
							: book.groups.join(", ")
						: tr("unknown"),
				value: "tag-groups"
			},
			{
				emoji: "🎩",
				label: tr("characters"),
				description:
					book?.charactersL?.length >= 1
						? book.charactersL.join(", ").length > 100
							? book.charactersL.join(", ").substring(0, 97) +
								"..."
							: book.charactersL.join(", ")
						: tr("original"),
				value: "tag-charactersL"
			},
			{
				emoji: "🔥",
				label: tr("tags"),
				description:
					book?.tags?.length >= 1
						? book.tags.join(", ").length > 100
							? book.tags.join("\n ").substring(0, 97) + "..."
							: book.tags.join(", ")
						: tr("unknown"),
				value: "tag-tag"
			},
			{
				emoji: "🌍",
				label: tr("languages"),
				description:
					book?.languages?.length >= 1
						? book.languages.join(", ").length > 100
							? book.languages.join(", ").substring(0, 97) + "..."
							: book.languages.join(", ")
						: tr("unknown"),
				value: "tag-languages"
			}
		);

	const bookBack = new ButtonBuilder()
		.setCustomId(`bookBack-${id}`)
		.setEmoji("⬅")
		.setStyle(ButtonStyle.Primary);
	const bookPage = new ButtonBuilder()
		.setCustomId(`bookPage-${id}`)
		.setLabel(`${book.currentPage}/${book.totalPages}`)
		.setStyle(ButtonStyle.Secondary)
		.setDisabled(true);
	const bookNext = new ButtonBuilder()
		.setCustomId(`bookNext-${id}`)
		.setEmoji("➡")
		.setStyle(ButtonStyle.Primary);

	return { cmdMenu, tagMenu, bookBack, bookPage, bookNext };
}

export {
	openBook,
	openBookShelf,
	getBookPage,
	getShelfBook,
	getBookComponents,
	getShelfComponents
};
