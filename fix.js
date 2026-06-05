const fs = require('fs');

function replaceEphemeral(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  code = code.replaceAll('ephemeral: true', 'flags: MessageFlags.Ephemeral');
  
  if (code.includes('import { Events, type Interaction } from "discord.js"')) {
    code = code.replace('import { Events, type Interaction } from "discord.js"', 'import { Events, type Interaction, MessageFlags } from "discord.js"');
  }
  fs.writeFileSync(filePath, code);
}

replaceEphemeral('src/events/interactionCreate.ts');
replaceEphemeral('src/commands/admin/nsfw.ts');
