const fs = require('fs');
let code = fs.readFileSync('src/commands/admin/nsfw.ts', 'utf8');
code = code.replace(/import \{ SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits \} from "discord.js";/, 'import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, MessageFlags } from "discord.js";');
fs.writeFileSync('src/commands/admin/nsfw.ts', code);
