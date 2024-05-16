import {
	CommandInteraction,
	SlashCommandBuilder,
	EmbedBuilder,
	PermissionsBitField
} from "discord.js";

export default {
	data: new SlashCommandBuilder()
		.setName("nsfw")
		.setDescription("Switch requires setting of NSFW channel")
		.setDescriptionLocalizations({
			"zh-TW": "開關需要NSFW頻道的設定"
		}),
	/**
	 *
	 * @param {Client} client
	 * @param {CommandInteraction} interaction
	 * @param {String[]} args
	 */
	async execute(client, interaction, args, tr, db) {
		if (
			!interaction.member.permissions.has(
				PermissionsBitField.Flags.ManageChannels
			)
		)
			return interaction.reply({
				embeds: [
					new EmbedBuilder()
						.setThumbnail(
							"https://media.discordapp.net/attachments/1057244827688910850/1110552508369219584/discord_1.gif"
						)
						.setTitle(tr("nsfw_noper"))
						.setColor("#E06469")
				],
				ephemeral: true
			});

		if ((await db.get(`${interaction.guild.id}.nonNSFW`)) != true) {
			await db.set(`${interaction.guild.id}.nonNSFW`, true);
			interaction.reply({
				embeds: [
					new EmbedBuilder()
						.setThumbnail(
							"https://media.discordapp.net/attachments/1057244827688910850/1110552199450333204/discord.gif"
						)
						.setTitle(tr("nsfw_unlock"))
						.setColor("#A4D0A4")
				],
				ephemeral: true
			});
		} else {
			await db.delete(`${interaction.guild.id}`);
			interaction.reply({
				embeds: [
					new EmbedBuilder()
						.setThumbnail(
							"https://media.discordapp.net/attachments/1057244827688910850/1110552199450333204/discord.gif"
						)
						.setTitle(tr("nsfw_lock"))
						.setColor("#A4D0A4")
				],
				ephemeral: true
			});
		}
	}
};
