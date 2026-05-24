import { Events, REST, Routes, type Client } from "discord.js";
import type { Event } from "../interfaces/Event";
import { Logger } from "../utils/Logger";
import type { ExtendedClient } from "../structures/Client";

const logger = new Logger("Ready");

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client: Client) {
    const ext = client as ExtendedClient;
    logger.success(`Logged in as ${client.user?.tag}`);
    logger.info(`Serving ${client.guilds.cache.size} guilds`);

    // Deploy slash commands
    try {
      const commands = [...ext.commands.values()].map((cmd) => cmd.data.toJSON());
      const rest = new REST().setToken(process.env.DISCORD_TOKEN!);
      await rest.put(Routes.applicationCommands(client.user!.id), { body: commands });
      logger.success(`Deployed ${commands.length} slash command(s) globally`);
    } catch (err) {
      logger.error(`Failed to deploy slash commands: ${err}`);
    }
  },
} satisfies Event;
