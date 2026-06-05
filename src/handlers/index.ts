import fs from "fs";
import path from "path";
import type { ExtendedClient } from "../structures/Client";
import type { Command } from "../interfaces/Command";
import type { Event } from "../interfaces/Event";
import { Logger } from "../utils/Logger";

const logger = new Logger("Handler");

function findFiles(dir: string, ext: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findFiles(full, ext));
    else if (entry.name.endsWith(ext)) results.push(full);
  }
  return results;
}

export async function loadCommands(client: ExtendedClient) {
  const dir = path.join(__dirname, "../commands");
  for (const file of findFiles(dir, ".js")) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(file);
    const cmd = (mod.default ?? mod) as Command;
    client.commands.set(cmd.data.name, cmd);
    logger.success(`Loaded command: ${cmd.data.name}`);
  }
}

export async function loadEvents(client: ExtendedClient) {
  const dir = path.join(__dirname, "../events");
  for (const file of findFiles(dir, ".js")) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(file);
    const event = (mod.default ?? mod) as Event;
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
    logger.success(`Loaded event: ${event.name}`);
  }
}
