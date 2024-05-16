import { client } from "./index.js";

import { Loader } from "./core/Loader.js";
import { Collection } from "discord.js";
import { ClusterClient } from "discord-hybrid-sharding";
import { QuickDB } from "quick.db";
const db = new QuickDB();

// Global Variables
client.db = db;
client.cluster = new ClusterClient(client);
client.commands = {
	slash: new Collection(),
	message: new Collection()
};
client.loader = new Loader(client);
await client.loader.load();

client.login(
	process.env.NODE_ENV === "dev" ? process.env.TESTOKEN : process.env.TOKEN
);
