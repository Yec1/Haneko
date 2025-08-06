import {
	ChatInputCommandInteraction,
	SlashCommandBuilder,
	EmbedBuilder,
	PermissionsBitField,
	Client,
	MessageFlags
} from "discord.js";
import { database } from "../index.js";

interface CommandExecuteParams {
	client: Client;
	interaction: ChatInputCommandInteraction;
	args: string[];
	tr: (key: string) => string;
}

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
	 * @param {ChatInputCommandInteraction} interaction
	 * @param {String[]} args
	 */
	async execute(
		client: Client,
		interaction: ChatInputCommandInteraction,
		args: string[],
		tr: (key: string) => string
	): Promise<void> {
		if (
			!(interaction.member?.permissions as any)?.has?.(
				PermissionsBitField.Flags.ManageChannels
			)
		)
			await interaction.reply({
				embeds: [
					new EmbedBuilder()
						.setThumbnail(
							"https://media.discordapp.net/attachments/1057244827688910850/1110552508369219584/discord_1.gif"
						)
						.setTitle(tr("nsfw_noper"))
						.setColor("#E06469")
				],
				flags: MessageFlags.Ephemeral
			});
		else {
			if (
				(await database.get(`${interaction.guild?.id}.nonNSFW`)) != true
			) {
				await database.set(`${interaction.guild?.id}.nonNSFW`, true);
				await interaction.reply({
					embeds: [
						new EmbedBuilder()
							.setThumbnail(
								"https://media.discordapp.net/attachments/1057244827688910850/1110552199450333204/discord.gif"
							)
							.setTitle(tr("nsfw_unlock"))
							.setColor("#A4D0A4")
					],
					flags: MessageFlags.Ephemeral
				});
			} else {
				await database.delete(`${interaction.guild?.id}`);
				await interaction.reply({
					embeds: [
						new EmbedBuilder()
							.setThumbnail(
								"https://media.discordapp.net/attachments/1057244827688910850/1110552199450333204/discord.gif"
							)
							.setTitle(tr("nsfw_lock"))
							.setColor("#A4D0A4")
					],
					flags: MessageFlags.Ephemeral
				});
			}
		}
	}
};
