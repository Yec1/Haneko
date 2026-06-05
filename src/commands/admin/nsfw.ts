import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from "discord.js";
import type { Command } from "../../interfaces/Command";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("nsfw")
    .setDescription("切換機器人是否允許在非 NSFW 頻道發送本子（需要編輯頻道權限）")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction: ChatInputCommandInteraction) {
    const { db } = interaction.client as any;
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({ content: "❌ 此指令只能在伺服器中使用。", ephemeral: true });
      return;
    }

    const current = db.nhGuildGetNsfwUnlock(guildId);
    const next = !current;
    db.nhGuildSetNsfwUnlock(guildId, next);

    if (next) {
      await interaction.reply({ content: "🔓 現在不需要在 NSFW 頻道就可以看本了", ephemeral: true });
    } else {
      await interaction.reply({ content: "🔒 現在需要在 NSFW 頻道才可以看本", ephemeral: true });
    }
  },
};

export default command;
