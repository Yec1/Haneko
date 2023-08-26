const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ComponentType,
} = require("discord.js");
const client = require("../index");
const { NHentai } = require("@shineiichijo/nhentai-ts");
const nhentai = new NHentai();

async function getPage(id, book, page) {
  await client.db.set(`${id}.book.currentPage`, page);
  return new EmbedBuilder()
    .setColor("#FDCEDF")
    .setTitle(book.title)
    .setFooter({
      text: `${page}/${book.num_pages} - ${book.id}`,
    })
    .setImage(
      `https://i.nhentai.net/galleries/${book.media_id}/${page}.${book.type}`
    );
}

async function openBook(interaction, book) {
  const parts = book.images.pages[0].split("/");
  const page = 1;
  await client.db.set(`${interaction.user.id}.book`, {
    title: book.originalTitle ? book.originalTitle : book.title,
    media_id: parts[parts.length - 2],
    id: book.id,
    num_pages: book.images.pages.length,
    type: parts[parts.length - 1].split(".")[1],
    currentPage: page,
  });

  interaction.editReply({
    embeds: [
      await getPage(
        interaction.user.id,
        await client.db.get(`${interaction.user.id}.book`),
        page
      ),
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`bookback-${interaction.user.id}`)
          .setEmoji("⬅")
          .setStyle(2),
        new ButtonBuilder()
          .setCustomId(`bookstop-${interaction.user.id}`)
          .setEmoji("⛔")
          .setStyle(4),
        new ButtonBuilder()
          .setCustomId(`booknext-${interaction.user.id}`)
          .setEmoji("➡")
          .setStyle(2)
      ),
    ],
  });
}

function getBookShelf(list, page) {
  const { data } = list;
  return new EmbedBuilder()
    .setColor("#FDCEDF")
    .setTitle(data[page].title)
    .setFooter({
      text: `${page + 1}/${data.length} - ${data[page].id}`,
    })
    .setImage(data[page]?.cover);
}

async function bookshelf(interaction, list) {
  let page = 0;
  const shelf = await interaction.editReply({
    embeds: [getBookShelf(list, page)],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`shelfback`).setEmoji("⬅").setStyle(2),
        new ButtonBuilder().setCustomId(`shelfopen`).setEmoji("✅").setStyle(3),
        new ButtonBuilder().setCustomId(`shelfnext`).setEmoji("➡").setStyle(2),
        new ButtonBuilder().setCustomId(`shelfclose`).setEmoji("🗑").setStyle(4)
      ),
    ],
  });

  const collector = await shelf.createMessageComponentCollector({
    componentType: ComponentType.Button,
  });
  collector.on("collect", async (i) => {
    if (!i.isButton()) return;
    if (i.customId == "shelfback") {
      page = page - 1 < 0 ? list.length : page - 1;
      i.message.edit({
        embeds: [getBookShelf(list, page)],
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`shelfback`)
              .setEmoji("⬅")
              .setStyle(2),
            new ButtonBuilder()
              .setCustomId(`shelfopen`)
              .setEmoji("✅")
              .setStyle(3),
            new ButtonBuilder()
              .setCustomId(`shelfnext`)
              .setEmoji("➡")
              .setStyle(2),
            new ButtonBuilder()
              .setCustomId(`shelfclose`)
              .setEmoji("🗑")
              .setStyle(4)
          ),
        ],
      });
    }
    if (i.customId == "shelfnext") {
      page = page + 1 > list.length ? 1 : page + 1;
      i.message.edit({
        embeds: [getBookShelf(list, page)],
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`shelfback`)
              .setEmoji("⬅")
              .setStyle(2),
            new ButtonBuilder()
              .setCustomId(`shelfopen`)
              .setEmoji("✅")
              .setStyle(3),
            new ButtonBuilder()
              .setCustomId(`shelfnext`)
              .setEmoji("➡")
              .setStyle(2),
            new ButtonBuilder()
              .setCustomId(`shelfclose`)
              .setEmoji("🗑")
              .setStyle(4)
          ),
        ],
      });
    }
    if (i.customId == "shelfopen")
      openBook(interaction, await nhentai.getDoujin(list.data[page].id));
    if (i.customId == "shelfclose") i.message.delete();
  });
}

module.exports = { getPage, openBook, bookshelf };
