const client = require("../index");
const { ActivityType } = require("discord.js");

client.on("ready", () => {
  client.user.setPresence({
    activities: [
      {
        name: `${client.guilds.cache.size} 個伺服器`,
        type: ActivityType.Watching,
      },
    ],
    status: "online",
  });

  console.log(`${client.user.tag} is up and ready to go!`);
});
