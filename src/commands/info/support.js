const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require("discord.js");

module.exports = {
  name: "support",
  description:
    "Encountered a bug or want to offer a suggestion? Use this command!",
  name_localizations: {
    "zh-TW": "協助",
  },
  description_localizations: {
    "zh-TW": "遇到錯誤或想提供建議? 使用這個命令!",
  },

  run: async (client, interaction, args, tr) => {
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setThumbnail(
            "https://media.discordapp.net/attachments/1057244827688910850/1110579077322129539/discord_3.gif"
          )
          .setColor("#F8E8EE")
          .setTitle(tr("support")),
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel(tr("support_server"))
            .setURL("https://discord.gg/mPCEATJDve")
            .setStyle(5)
        ),
      ],
    });
  },
};
