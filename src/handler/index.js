require("dotenv").config();
const { readdirSync } = require("fs");

module.exports = async (client) => {
  // SlashCommands
  const data = [];
  readdirSync(`${process.cwd()}/src/commands`).forEach((dir) => {
    const slashCommandFile = readdirSync(
      `${process.cwd()}/src/commands/${dir}/`
    ).filter((files) => files.endsWith(".js"));

    for (const file of slashCommandFile) {
      const slashCommand = require(`${process.cwd()}/src/commands/${dir}/${file}`);

      if (!slashCommand.name) return;
      if (["MESSAGE", "USER"].includes(file.type)) delete file.description;

      client.slashCommands.set(slashCommand.name, slashCommand);
      data.push(slashCommand);
    }
  });
  // Events
  const events = readdirSync(`${process.cwd()}/src/events/`).filter((file) =>
    file.endsWith(".js")
  );
  for (const file of events) require(`${process.cwd()}/src/events/${file}`);

  client.on("ready", async () => {
    await client.application.commands.set(data);
  });
};
