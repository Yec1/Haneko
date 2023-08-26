const { EmbedBuilder, ChannelType } = require("discord.js");
const { openBook, bookshelf } = require("../../util/book");
const { NHentai } = require("@shineiichijo/nhentai-ts");
const nhentai = new NHentai();

module.exports = {
  name: "nhentai",
  description: "Watch nhentai",
  name_localizations: {
    "zh-TW": "nhentai",
  },
  description_localizations: {
    "zh-TW": "觀看 nhentai",
  },
  type: 1,
  options: [
    {
      name: "specific",
      description: "Designate a book by a specific number / URL",
      name_localizations: {
        "zh-TW": "指定",
      },
      description_localizations: {
        "zh-TW": "透過特定 號碼 / 網址 來指定本子",
      },
      type: 1,
      options: [
        {
          name: "number",
          description: "Number or Link",
          name_localizations: {
            "zh-TW": "號碼",
          },
          description_localizations: {
            "zh-TW": "號碼 或者 連結",
          },
          type: 3, //string
          required: true,
        },
      ],
    },
    {
      name: "random",
      description:
        "A all random book (take responsibility for appearances that should not appear)",
      name_localizations: {
        "zh-TW": "隨機",
      },
      description_localizations: {
        "zh-TW": "出現一切隨機的本子 (出現不該出現的自行負責)",
      },
      type: 1,
    },
    {
      name: "search",
      description: "Search",
      name_localizations: {
        "zh-TW": "搜尋",
      },
      description_localizations: {
        "zh-TW": "大範圍搜尋",
      },
      type: 1,
      options: [
        {
          name: "name",
          description: "Name",
          name_localizations: {
            "zh-TW": "名稱",
          },
          description_localizations: {
            "zh-TW": "名稱",
          },
          type: 3, //string
          required: true,
        },
      ],
    },
  ],

  run: async (client, interaction, args, tr) => {
    if (
      interaction.channel.type == ChannelType.PrivateThread ||
      interaction.channel.type == ChannelType.PublicThread
        ? interaction.channel.parent.nsfw == false
        : interaction.channel.nsfw == false &&
          (await client.db.get(`${interaction.guild.id}.nonNSFW`)) != true
    )
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setThumbnail(
              "https://media.discordapp.net/attachments/1057244827688910850/1110552508369219584/discord_1.gif"
            )
            .setTitle(tr("nhentai_nsfw"))
            .setColor("#E06469"),
        ],
        ephemeral: true,
      });

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setThumbnail(
            "https://media.discordapp.net/attachments/1057244827688910850/1112383837717155850/Paw.gif"
          )
          .setTitle(tr("nhentai_searching"))
          .setColor("#9DB2BF"),
      ],
    });

    switch (interaction.options._subcommand) {
      case "specific":
        const id = interaction.options.getString("number");
        const book = await nhentai.getDoujin(id);

        if (!book)
          return interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setThumbnail(
                  "https://media.discordapp.net/attachments/1057244827688910850/1110567165637185697/discord_2.gif"
                )
                .setTitle(tr("nhentai_nofound"))
                .setColor("#E06469"),
            ],
          });

        openBook(interaction, book);
        break;
      case "random":
        openBook(interaction, await nhentai.getRandom());
        break;
      case "search":
        const name = interaction.options.getString("name");
        try {
          res = await nhentai.search(name);
        } catch (e) {
          return interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setThumbnail(
                  "https://media.discordapp.net/attachments/1057244827688910850/1110567165637185697/discord_2.gif"
                )
                .setTitle(tr("nhentai_nofound2"))
                .setColor("#E06469"),
            ],
          });
        }
        bookshelf(interaction, res);
        break;
    }
  },
};
