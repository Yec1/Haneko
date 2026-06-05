import { REST, Routes } from "discord.js";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const isDev = process.env.NODE_ENV === "development";
const TOKEN = isDev
  ? process.env.TEST_DISCORD_TOKEN!
  : process.env.DISCORD_TOKEN!;
const CLIENT_ID = isDev
  ? process.env.TEST_CLIENT_ID ?? process.env.CLIENT_ID!
  : process.env.CLIENT_ID!;
const GUILD_ID = process.env.GUILD_ID; // 留空 = 全域部署

if (!TOKEN || !CLIENT_ID) {
  console.error("❌ 缺少 DISCORD_TOKEN 或 CLIENT_ID");
  process.exit(1);
}

function findCommandFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findCommandFiles(full));
    else if (entry.name.endsWith(".js")) results.push(full);
  }
  return results;
}

async function deploy() {
  const commands: object[] = [];
  const dir = path.join(__dirname, "../dist/commands");

  for (const file of findCommandFiles(dir)) {
    const mod = require(file);
    const cmd = mod.default ?? mod;
    if (cmd?.data?.toJSON) {
      commands.push(cmd.data.toJSON());
      console.log(`  + ${cmd.data.name}`);
    }
  }

  const rest = new REST().setToken(TOKEN);

  if (GUILD_ID) {
    console.log(`\n부署 ${commands.length} 個指令到伺服器 ${GUILD_ID}...`);
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log("✅ 伺服器指令部署完成！");
  } else {
    console.log(`\n部署 ${commands.length} 個指令（全域）...`);
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log("✅ 全域指令部署完成！（最多 1 小時生效）");
  }
}

deploy().catch(console.error);
