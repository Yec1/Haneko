import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
import { Command } from "../../interfaces/Command";
import { CustomDatabase } from "../../utils/Database";

const MAX_TEAM_SIZE = 10;

export default {
  data: new SlashCommandBuilder()
    .setName("team")
    .setDescription("Manage who can interact with your /nh book buttons")
    .setNameLocalizations({ "zh-TW": "團隊" })
    .setDescriptionLocalizations({ "zh-TW": "管理哪些使用者可以操作你的本子按鈕" })
    .addSubcommand(sub =>
      sub
        .setName("add")
        .setDescription("Add a user to your team")
        .setNameLocalizations({ "zh-TW": "新增" })
        .setDescriptionLocalizations({ "zh-TW": "新增成員至你的團隊" })
        .addUserOption(opt =>
          opt
            .setName("user")
            .setDescription("User to add")
            .setNameLocalizations({ "zh-TW": "使用者" })
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("remove")
        .setDescription("Remove a user from your team")
        .setNameLocalizations({ "zh-TW": "移除" })
        .setDescriptionLocalizations({ "zh-TW": "從你的團隊移除成員" })
        .addUserOption(opt =>
          opt
            .setName("user")
            .setDescription("User to remove")
            .setNameLocalizations({ "zh-TW": "使用者" })
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("list")
        .setDescription("View your team members")
        .setNameLocalizations({ "zh-TW": "列表" })
        .setDescriptionLocalizations({ "zh-TW": "查看你的團隊成員" })
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const db = (interaction.client as any).db as CustomDatabase;
    const ownerId = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    if (sub === "add") {
      const target = interaction.options.getUser("user", true);

      if (target.id === ownerId) {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ 不能把自己加進團隊")
              .setColor(0xe06469),
          ],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (target.bot) {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ 不能加入機器人")
              .setColor(0xe06469),
          ],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const current = db.teamGet(ownerId);
      if (current.includes(target.id)) {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ 已在團隊中")
              .setDescription(`<@${target.id}> 已經在你的團隊裡了`)
              .setColor(0xe06469),
          ],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (current.length >= MAX_TEAM_SIZE) {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ 團隊已滿")
              .setDescription(`最多可新增 ${MAX_TEAM_SIZE} 名成員`)
              .setColor(0xe06469),
          ],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      db.teamAdd(ownerId, target.id);
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("✅ 新增成功")
            .setDescription(`已將 <@${target.id}> 加入你的團隊\n他們現在可以操作你的本子按鈕`)
            .setColor(0xa4d0a4),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    else if (sub === "remove") {
      const target = interaction.options.getUser("user", true);

      if (target.id === ownerId) {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ 不能移除自己")
              .setColor(0xe06469),
          ],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (!db.teamIncludes(ownerId, target.id)) {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ 此人不在團隊中")
              .setDescription(`<@${target.id}> 不在你的團隊裡`)
              .setColor(0xe06469),
          ],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      db.teamRemove(ownerId, target.id);
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("✅ 移除成功")
            .setDescription(`已將 <@${target.id}> 從你的團隊移除`)
            .setColor(0xa4d0a4),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    else if (sub === "list") {
      const members = db.teamGet(ownerId);
      const description =
        members.length > 0
          ? members.map((id, i) => `\`${i + 1}\` • <@${id}>`).join("\n")
          : "目前沒有團隊成員";

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(`${interaction.user.username} 的團隊`)
            .setDescription(description)
            .setThumbnail(interaction.user.displayAvatarURL({ size: 256 }))
            .setFooter({ text: `${members.length}/${MAX_TEAM_SIZE} 名成員` })
            .setColor(0xfdcedf),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }
  },
} satisfies Command;
