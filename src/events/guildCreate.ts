import { Events, WebhookClient, EmbedBuilder, Guild } from "discord.js";
import type { Event } from "../interfaces/Event.js";
import moment from "moment";

export default {
  name: Events.GuildCreate,
  once: false,
  async execute(guild: Guild) {
    const webhook = process.env.JLWEBHOOK
      ? new WebhookClient({ url: process.env.JLWEBHOOK })
      : null;
    if (!webhook) return;

    const totalGuilds = guild.client.guilds.cache.size;

    await webhook.send({
      embeds: [
        new EmbedBuilder()
          .setColor("#57F287")
          .setThumbnail(guild.iconURL())
          .setTitle("新的伺服器出現了")
          .addFields(
            { name: "名稱", value: `\`${guild.name}\``, inline: false },
            { name: "ID", value: `\`${guild.id}\``, inline: false },
            { name: "擁有者", value: `<@${guild.ownerId}>`, inline: false },
            { name: "人數", value: `\`${guild.memberCount}\` 個成員`, inline: false },
            { name: "建立時間", value: `<t:${moment(guild.createdAt).unix()}:F>`, inline: false },
            { name: `${guild.client.user?.username} 的伺服器數量`, value: `\`${totalGuilds}\` 個伺服器`, inline: false }
          )
          .setTimestamp(),
      ],
    }).catch(() => {});
  },
} satisfies Event;
