const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ComponentType,
} = require("discord.js");
const os = require("os");
const ms = require("ms");

module.exports = {
  name: "info",
  description: "Information of bot",
  name_localizations: {
    "zh-TW": "資訊",
  },
  description_localizations: {
    "zh-TW": "機器人的資訊",
  },

  run: async (client, interaction, args, tr) => {
    var page2;
    function refresh() {
      const memory = process.memoryUsage();
      var percent =
        (((os.totalmem() - os.freemem()) / os.totalmem()) * 100).toFixed(2) +
        "%";
      page2 = new EmbedBuilder()
        .setColor("#F8E8EE")
        .setDescription(`\`\`\`${tr("info_title")}\`\`\``)
        .addField(tr("info_Uptime"), `${ms(client.uptime)}`, true)
        .addField(tr("Ping"), `${Math.floor(client.ws.ping)}ms`, true)
        .addField(tr("info_Servers"), `${client.guilds.cache.size} `, true)
        .addField(
          tr("info_MemoryUsage"),
          `\`${Math.floor(memory.heapUsed / 1024 / 1024)} MB\` / \`${Math.floor(
            memory.heapTotal / 1024 / 1024
          )} MB\` / \`${Math.floor(
            memory.rss / 1024 / 1024
          )} MB\` (\`${percent}\`)`,
          true
        );
    }
    var curPage = 1;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("info_s_switch")
        .setLabel(tr("Switch"))
        .setStyle(2)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("info_s_switch")
        .setLabel(tr("Switch"))
        .setStyle(2),
      new ButtonBuilder()
        .setCustomId("info_s_refresh")
        .setLabel(tr("Refresh"))
        .setEmoji("🔄")
        .setStyle(1)
    );

    const page1 = new EmbedBuilder()
      .setColor("#F8E8EE")
      .setDescription(`\`\`\`${tr("info_title")}\`\`\``)
      .addField(tr("info_Devs"), "> [Yeci](https://github.com/yeci226)", true);

    refresh();
    const resp = await interaction.reply({
      embeds: [page1],
      components: [row],
    });
    const filter = (i) => true;

    const collector = resp.createMessageComponentCollector({
      filter,
      componentType: ComponentType.Button,
    });

    collector.on("collect", async (interaction) => {
      if (!interaction.isButton()) return;
      if (interaction.customId === "info_s_switch") {
        refresh();
        let pages = [page1, page2];
        if (++curPage > pages.length) curPage = 1;
        if (curPage === 2)
          return interaction.message?.edit({
            embeds: [pages[curPage - 1]],
            components: [row2],
          });
        else
          return interaction.message?.edit({
            embeds: [pages[curPage - 1]],
            components: [row],
          });
      }
      if (interaction.customId === "info_s_refresh") {
        refresh();
        return interaction.message?.edit({
          embeds: [page2],
          components: [row2],
        });
      }
    });
  },
};
