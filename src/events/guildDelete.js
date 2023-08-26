const client = require("../index");
const { WebhookClient, EmbedBuilder, ActivityType } = require("discord.js");
const moment = require("moment-timezone");
const { QuickDB } = require("quick.db");
const db = new QuickDB();
const webhook = new WebhookClient({ url: process.env.JLWEBHOOK });

client.on("guildDelete", async (guild) => {
  if (await db.has(`${guild.id}`)) await db.delete(`${guild.id}`);

  client.user.setPresence({
    activities: [
      {
        name: `${client.guilds.cache.size} 個伺服器`,
        type: ActivityType.Watching,
      },
    ],
    status: "online",
  });

  webhook.send({
    embeds: [
      new EmbedBuilder()
        .setThumbnail(guild.iconURL())
        .setTitle("已離開伺服器")
        .addFields({ name: "名稱", value: `\`${guild.name}\``, inline: false })
        .addFields({ name: "ID", value: `\`${guild.id}\``, inline: false })
        .addFields({
          name: "擁有者",
          value: `<@${guild.ownerId}>`,
          inline: false,
        })
        .addFields({
          name: "人數",
          value: `\`${guild.memberCount}\` 個成員`,
          inline: false,
        })
        .addFields({
          name: "建立時間",
          value: `<t:${moment(guild.createdAt).unix()}:F>`,
          inline: false,
        })
        .addFields({
          name: `${client.user.username} 的伺服器數量`,
          value: `\`${client.guilds.cache.size}\` 個伺服器`,
          inline: false,
        })
        .setColor("#E74C3C")
        .setTimestamp(),
    ],
  });
});