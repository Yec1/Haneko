import { client, commands } from "../index.js";
import {
	ApplicationCommandOptionType,
	PermissionsBitField,
	Events,
	EmbedBuilder,
	WebhookClient,
	ChannelType,
	Interaction,
	ButtonInteraction,
	MessageFlags
} from "discord.js";
import { createTranslator } from "../services/i18n.js";
import { Logger } from "../services/logger.js";

const webhook = new WebhookClient({ url: process.env.CMDWEBHOOK! });

const permissionsToCheck = [
	PermissionsBitField.Flags.SendMessages,
	PermissionsBitField.Flags.ViewChannel,
	PermissionsBitField.Flags.EmbedLinks,
	PermissionsBitField.Flags.ReadMessageHistory
];

const permissionNames: Record<string, string> = {
	[PermissionsBitField.Flags.SendMessages.toString()]: "SendMessages",
	[PermissionsBitField.Flags.ViewChannel.toString()]: "ViewChannel",
	[PermissionsBitField.Flags.EmbedLinks.toString()]: "EmbedLinks",
	[PermissionsBitField.Flags.ReadMessageHistory.toString()]:
		"ReadMessageHistory"
};

client.on(
	Events.InteractionCreate,
	async (interaction: Interaction): Promise<void> => {
		if (interaction.channel?.type == ChannelType.DM) return;

		const i18n = createTranslator(interaction.locale || "en");

		if (interaction.channel && interaction.guild?.members.me) {
			const missingPermissions = permissionsToCheck.filter(
				permission =>
					!(interaction.channel as any)
						?.permissionsFor?.(interaction.guild?.members.me!)
						?.has(permission)
			);

			if (missingPermissions.length > 0) {
				const missingPermissionNames = missingPermissions.map(
					permission => permissionNames[permission.toString()]
				);
				if (interaction.isRepliable()) {
					await interaction.reply({
						embeds: [
							new EmbedBuilder()
								.setThumbnail(
									"https://media.discordapp.net/attachments/1057244827688910850/1110552508369219584/discord_1.gif"
								)
								.setTitle(
									`${i18n("MissingPermission")}\n \`${missingPermissionNames.join("`, `")}\``
								)
								.setColor("#E06469")
						],
						flags: MessageFlags.Ephemeral
					});
				}
				return;
			}
		}

		if (interaction.isButton()) {
			await (interaction as ButtonInteraction)
				.deferUpdate()
				.catch(() => {});
		}

		if (interaction.isChatInputCommand()) {
			const command = commands.slash.get(interaction.commandName);
			if (!command) {
				await interaction.followUp({
					content: "An error has occured",
					flags: MessageFlags.Ephemeral
				});
				return;
			}

			const args: string[] = [];

			for (let option of interaction.options.data) {
				if (option.type === ApplicationCommandOptionType.Subcommand) {
					if (option.name) args.push(option.name);
					option.options?.forEach((x: any) => {
						if (x.value) args.push(String(x.value));
					});
				} else if (option.value) args.push(String(option.value));
			}

			try {
				await (command.execute as any)(client, interaction, args, i18n);

				const time = `花費 ${(
					(Date.now() - interaction.createdTimestamp) /
					1000
				).toFixed(2)} 秒`;

				new Logger("指令").info(
					`${interaction.user.displayName}(${interaction.user.id}) 執行 ${command.data.name} - ${time}`
				);
				webhook.send({
					embeds: [
						new EmbedBuilder()
							.setTimestamp()
							.setAuthor({
								iconURL: interaction.user.displayAvatarURL({
									size: 4096
								}),
								name: `${interaction.user.username} - ${interaction.user.id}`
							})
							.setThumbnail(
								interaction.guild?.iconURL({
									size: 4096
								}) || null
							)
							.setDescription(
								`\`\`\`${interaction.guild?.name} - ${interaction.guild?.id}\`\`\``
							)
							.addFields(
								{
									name: command.data.name,
									value: `\`\`\`${interaction.guild?.name} - ${interaction.guild?.id}\`\`\``,
									inline: true
								},
								{
									name: "Command",
									value: `${
										(interaction.options as any)._subcommand
											? `> ${(interaction.options as any)._subcommand}`
											: "\u200b"
									} ${
										(interaction.options as any)
											._hoistedOptions > 0
											? ` \`${(interaction.options as any)._hoistedOptions[0].value}\``
											: "\u200b"
									}`,
									inline: true
								}
							)
					]
				});
			} catch (e: any) {
				new Logger("指令").error(`錯誤訊息：${e.message}`);
				if (interaction.isRepliable()) {
					await interaction.followUp({
						content: "哦喲，好像出了一點小問題，請重試",
						flags: MessageFlags.Ephemeral
					});
				}
			}
		} else if (interaction.isContextMenuCommand()) {
			const command = commands.slash.get(interaction.commandName);
			if (!command) return;
			try {
				await (command.execute as any)(client, interaction);
			} catch (e: any) {
				new Logger("指令").error(`錯誤訊息：${e.message}`);
				if (interaction.isRepliable()) {
					await interaction.reply({
						content: "哦喲，好像出了一點小問題，請重試",
						flags: MessageFlags.Ephemeral
					});
				}
			}
		}
	}
);
