import { client } from "../index.js";
import { ApplicationCommandOptionType, PermissionsBitField } from "discord.js";
import { i18nMixin, toI18nLang } from "../services/i18n.js";
import { Events, EmbedBuilder, WebhookClient, ChannelType } from "discord.js";
import { Logger } from "../services/logger.js";

const db = client.db;
const webhook = new WebhookClient({ url: process.env.CMDWEBHOOK });

const permissionsToCheck = [
	PermissionsBitField.Flags.SendMessages,
	PermissionsBitField.Flags.ViewChannel,
	PermissionsBitField.Flags.EmbedLinks,
	PermissionsBitField.Flags.ReadMessageHistory
];

const permissionNames = {
	[PermissionsBitField.Flags.SendMessages]: "SendMessages",
	[PermissionsBitField.Flags.ViewChannel]: "ViewChannel",
	[PermissionsBitField.Flags.EmbedLinks]: "EmbedLinks",
	[PermissionsBitField.Flags.ReadMessageHistory]: "ReadMessageHistory"
};

client.on(Events.InteractionCreate, async interaction => {
	if (interaction.channel.type === ChannelType.DM) return;

	const i18n = i18nMixin(toI18nLang(interaction.locale) || "en");

	const missingPermissions = permissionsToCheck.filter(
		permission =>
			!interaction.channel
				.permissionsFor(interaction.guild.members.me)
				.has(permission)
	);

	if (missingPermissions.length > 0) {
		const missingPermissionNames = missingPermissions.map(
			permission => permissionNames[permission]
		);
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
			ephemeral: true
		});
		return; // Exit early if permissions are missing
	}

	// Command execution logic
	const command = client.commands.slash.get(interaction.commandName);
	if (!command) {
		return interaction.followUp({
			content: "An error has occurred",
			ephemeral: true
		});
	}

	const args = interaction.options.data
		.flatMap(option =>
			option.type === ApplicationCommandOptionType.Subcommand
				? [
						option.name,
						...option.options?.map(x => x.value).filter(Boolean)
					]
				: [option.value]
		)
		.filter(Boolean);

	try {
		await command.execute(client, interaction, args, i18n, db);

		const timeElapsed = (
			(Date.now() - interaction.createdTimestamp) /
			1000
		).toFixed(2);
		new Logger("指令").command(
			`${interaction.user.displayName}(${interaction.user.id}) 執行 ${command.data.name} - 花費 ${timeElapsed} 秒`
		);

		await webhook.send({
			embeds: [
				new EmbedBuilder()
					.setTimestamp()
					.setAuthor({
						iconURL: interaction.user.displayAvatarURL({
							size: 4096,
							dynamic: true
						}),
						name: `${interaction.user.username} - ${interaction.user.id}`
					})
					.setThumbnail(
						interaction.guild.iconURL({ size: 4096, dynamic: true })
					)
					.setDescription(
						`\`\`\`${interaction.guild.name} - ${interaction.guild.id}\`\`\``
					)
					.addField(
						command.data.name,
						`> ${interaction.options._subcommand || "\u200b"} ${interaction.options._hoistedOptions?.[0]?.value ? `\`${interaction.options._hoistedOptions[0].value}\`` : "\u200b"}`,
						true
					)
			]
		});
	} catch (e) {
		new Logger("指令").error(`錯誤訊息：${e.message}`);
		await interaction.reply({
			content: "哦喲，好像出了一點小問題，請重試",
			ephemeral: true
		});
	}
});
