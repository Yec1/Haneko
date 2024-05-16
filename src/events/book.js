import { client } from "../index.js";
import {
  getBookPage,
  getBookComponents,
  getShelfBook,
  getShelfComponents,
  openBook,
} from "../services/book.js";
import { EmbedBuilder, ActionRowBuilder } from "discord.js";
import { i18nMixin, toI18nLang } from "../services/i18n.js";
import { NHentai } from "@shineiichijo/nhentai-ts";
const nhentai = new NHentai();
const db = client.db;

client.on("interactionCreate", async (interaction) => {
  const tr = i18nMixin(toI18nLang(interaction.locale) || "en");
  if (interaction.isButton()) {
    await interaction.deferUpdate().catch(() => {});
    const { customId } = interaction;

    if (customId.startsWith("shelf")) {
      const shelfDB = await db.get(`${interaction.user.id}.shelf`);
      const isShelfBackD = customId.startsWith("shelfBackD-");
      const isShelfNextD = customId.startsWith("shelfNextD-");
      const isShelfBack = customId.startsWith("shelfBack-");
      const isShelfNext = customId.startsWith("shelfNext-");

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
        await db.set(`${interaction.user.id}.shelf.currentPage`, shelfPage);
      }

      if (isShelfBack || isShelfNext) {
        shelfIndex = isShelfBack
          ? shelfIndex - 1 < 1
            ? shelfIndex
            : shelfIndex - 1
          : shelfIndex + 1 > 29
            ? shelfPage + 1
            : shelfIndex + 1;
      }

      await db.set(`${interaction.user.id}.shelf.currentIndex`, shelfIndex);

      const res =
        shelfDB.name != null
          ? shelfDB.type == "searchwithtag"
            ? await nhentai.searchWithTag(shelfDB.name, {
                page: parseInt(shelfPage),
              })
            : await nhentai.search(shelfDB.name, {
                page: parseInt(shelfPage),
              })
          : await nhentai.explore(parseInt(shelfPage));

      if (customId.startsWith("shelfCheck"))
        return interaction.message.edit(
          await openBook(
            tr,
            interaction,
            await nhentai.getDoujin(res.data[shelfIndex - 1].id)
          )
        );

      const { backD, back, page, next, nextD, check } = getShelfComponents(
        tr,
        interaction.user.id,
        shelfIndex,
        res
      );

      return interaction.message.edit({
        embeds: [getShelfBook(res.data[shelfIndex - 1])],
        components: [
          new ActionRowBuilder().addComponents(backD, back, page, next, nextD),
          new ActionRowBuilder().addComponents(check),
        ],
      });
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
              .setColor("#E06469"),
          ],
          ephemeral: true,
        });
      }

      const book = await db.get(`${ownerId}.book`);
      let page = book.currentPage;
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
        getBookComponents(tr, ownerId, await db.get(`${ownerId}.book`));

      return interaction.message.edit({
        embeds: [getBookPage(book, page)],
        components: [
          new ActionRowBuilder().addComponents(bookBack, bookPage, bookNext),
          new ActionRowBuilder().addComponents(cmdMenu),
          new ActionRowBuilder().addComponents(tagMenu),
        ],
      });
    }
  } else if (interaction.isStringSelectMenu()) {
    await interaction.deferUpdate().catch(() => {});
    const customId = interaction.values[0];
    if (customId.startsWith("tag")) return;
    const ownerId = customId.match(/-(\d+)$/)[1];
    const book = await db.get(`${ownerId}.book`);
    const { cmdMenu, tagMenu, bookBack, bookPage, bookNext } =
      getBookComponents(tr, ownerId, await db.get(`${ownerId}.book`));

    if (customId.startsWith("bookOpen-")) {
      return interaction.message.edit({
        embeds: [getBookPage(book, page)],
        components: [
          new ActionRowBuilder().addComponents(bookBack, bookPage, bookNext),
          new ActionRowBuilder().addComponents(cmdMenu),
          new ActionRowBuilder().addComponents(tagMenu),
        ],
      });
    } else if (customId.startsWith("bookStop-")) {
      await db.delete(`${ownerId}.book`);
      return interaction.message.delete();
    }
  }
});
