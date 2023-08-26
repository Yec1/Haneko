require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
} = require("discord.js");
const { QuickDB } = require("quick.db");
const db = new QuickDB();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.User,
    Partials.GuildMember,
    Partials.Reaction,
  ],
});
module.exports = client;

// Global Variables
client.db = db;
client.commands = new Collection();
client.slashCommands = new Collection();
require("./handler")(client);
require("./util/index");

client.login(
  process.env.NODE_ENV === "dev" ? process.env.TESTOKEN : process.env.TOKEN
);
