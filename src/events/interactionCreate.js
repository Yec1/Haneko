const client = require("../index");
const { WebhookClient, EmbedBuilder } = require("discord.js");
const moment = require("moment-timezone");
const webhook = new WebhookClient({ url: process.env.CMDWEBHOOK });
const { i18nMixin, tl3 } = require("../util/i18n");

client.on("interactionCreate", async (interaction) => {
  const i18n = i18nMixin(tl3(interaction.locale) || "en");
  // Slash Command Handling
  if (interaction.isChatInputCommand()) {
    const cmd = client.slashCommands.get(interaction.commandName);
    if (!cmd) return interaction.followUp({ content: "An error has occurred" });

    const args = [];

    for (let option of interaction.options.data) {
      if (option.type === "SUB_COMMAND") {
        if (option.name) args.push(option.name);
        option.options?.forEach((x) => {
          if (x.value) args.push(x.value);
        });
      } else if (option.value) args.push(option.value);
    }

    webhook.send({
      embeds: [
        new EmbedBuilder().setDescription(
          `\`\`\`ini\n${moment()
            .tz("Asia/Taipei")
            .format("h:mm:ss a")}\nServer [ ${
            interaction.guild.name
          } ]\nUser [ ${interaction.user.username} ] \nrun [ ${cmd.name}${
            interaction.options._subcommand
              ? ` ${interaction.options._subcommand}`
              : ""
          } ]\n\`\`\``
        ),
      ],
    });

    cmd.run(client, interaction, args, i18n);
  }
});
