const client = require("../index");
const { getPage } = require("../util/book");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  PermissionsBitField,
} = require("discord.js");
const { i18nMixin, tl3 } = require("../util/i18n");

client.on("interactionCreate", async (interaction) => {
  const tr = i18nMixin(tl3(interaction.locale) || "en");
  if (!interaction.isButton()) return;

  await interaction.deferUpdate().catch(() => {});

  const { customId } = interaction;
  const ownerId = customId.match(/-(\d+)$/)[1];
  const userId = interaction.user.id;
  const teamPath = `${ownerId}.team`;

  if (
    !interaction.guild.members.me.permissions.has(
      PermissionsBitField.Flags.SendMessages
    ) ||
    interaction.customId == "info_s_refresh" ||
    interaction.customId == "info_s_switch" ||
    interaction.customId.startsWith("shelf")
  )
    return;

  let id = userId;
  if (await client.db.has(teamPath)) {
    const team = await client.db.get(teamPath);
    if (team.length > 0) {
      id = userId === ownerId ? userId : ownerId;
    }
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

  const book = await client.db.get(`${ownerId}.book`);
  let page = book.currentPage;

  if (interaction.customId.startsWith("bookback-")) {
    page = page - 1 < 1 ? book.num_pages : page - 1;
  } else if (interaction.customId.startsWith("booknext-")) {
    page = page + 1 > book.num_pages ? 1 : page + 1;
  } else if (interaction.customId.startsWith("bookopen-")) {
    return interaction.message.edit({
      embeds: [await getPage(ownerId, book, page)],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`bookback-${ownerId}`)
            .setEmoji("⬅")
            .setStyle(2),
          new ButtonBuilder()
            .setCustomId(`bookstop-${ownerId}`)
            .setEmoji("⛔")
            .setStyle(4),
          new ButtonBuilder()
            .setCustomId(`booknext-${ownerId}`)
            .setEmoji("➡")
            .setStyle(2)
        ),
      ],
    });
  } else if (interaction.customId.startsWith("bookstop-")) {
    return interaction.message.edit({
      embeds: [
        new EmbedBuilder()
          .setColor("#FDCEDF")
          .setTitle(book.title)
          .setDescription(
            tr("book_close", {
              z: `<@${interaction.user.id}>`,
            })
          ),
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`bookopen-${ownerId}`)
            .setEmoji("🔓")
            .setStyle(1),
          new ButtonBuilder()
            .setCustomId(`bookdelete-${ownerId}`)
            .setEmoji("🗑")
            .setStyle(2)
        ),
      ],
    });
  } else if (interaction.customId.startsWith("bookdelete-")) {
    await client.db.delete(`${ownerId}.book`);
    return interaction.message.delete();
  }

  return interaction.message.edit({
    embeds: [await getPage(ownerId, book, page)],
  });
});
