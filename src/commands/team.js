import {
	CommandInteraction,
	SlashCommandBuilder,
	EmbedBuilder
} from "discord.js";

export default {
	data: new SlashCommandBuilder()
		.setName("team")
		.setDescription("Edit whether other users can operate your own book")
		.setNameLocalizations({
			"zh-TW": "團隊"
		})
		.setDescriptionLocalizations({
			"zh-TW": "編輯其他使用者是否能操作自己的本子"
		})
		.addSubcommand(subcommand =>
			subcommand
				.setName("add")
				.setDescription("Add other users to operate your own book")
				.setNameLocalizations({
					"zh-TW": "新增"
				})
				.setDescriptionLocalizations({
					"zh-TW": "添加其他使用者可操作自己的本子"
				})
				.addUserOption(option =>
					option
						.setName("user")
						.setDescription("The user you want to add")
						.setNameLocalizations({
							"zh-TW": "使用者"
						})
						.setDescriptionLocalizations({
							"zh-TW": "你想要添加的使用者"
						})
						.setRequired(true)
				)
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName("remove")
				.setDescription("Delete a user that has been added to a team")
				.setNameLocalizations({
					"zh-TW": "刪除"
				})
				.setDescriptionLocalizations({
					"zh-TW": "刪除已在團隊中的使用者使其無法操作自己的本子"
				})
				.addUserOption(option =>
					option
						.setName("user")
						.setDescription("The user you want to delete")
						.setNameLocalizations({
							"zh-TW": "使用者"
						})
						.setDescriptionLocalizations({
							"zh-TW": "你想要刪除的使用者"
						})
						.setRequired(true)
				)
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName("list")
				.setDescription("View your team members")
				.setNameLocalizations({
					"zh-TW": "列表"
				})
				.setDescriptionLocalizations({
					"zh-TW": "查看你的團隊成員"
				})
		),
	/**
	 *
	 * @param {Client} client
	 * @param {CommandInteraction} interaction
	 * @param {String[]} args
	 */
	async execute(client, interaction, args, tr, db) {
		const teamPath = `${interaction.user.id}.team`;
		const cmd = interaction.options.getSubcommand();
		if (cmd == "add") {
			const user = interaction.options.getUser("user").id;

			if (user == interaction.user.id)
				return interaction.reply({
					embeds: [
						new EmbedBuilder()
							.setTitle(tr("team_addself"))
							.setThumbnail(
								"https://media.discordapp.net/attachments/1057244827688910850/1110552508369219584/discord_1.gif"
							)
							.setColor("#E06469")
					],
					ephemeral: true
				});

			if (await db.has(teamPath)) {
				const team = await db.get(teamPath);
				if (team.includes(user))
					return interaction.reply({
						embeds: [
							new EmbedBuilder()
								.setThumbnail(
									"https://media.discordapp.net/attachments/1057244827688910850/1110552508369219584/discord_1.gif"
								)
								.setTitle(tr("team_addfail"))
								.setDescription(
									tr("team_addesc", {
										z: `<@${user}>`
									})
								)
								.setColor("#E06469")
						],
						ephemeral: true
					});
			}

			await db.push(teamPath, user);
			interaction.reply({
				embeds: [
					new EmbedBuilder()
						.setThumbnail(
							"https://media.discordapp.net/attachments/1057244827688910850/1110552199450333204/discord.gif"
						)
						.setTitle(tr("team_addsus"))
						.setDescription(
							tr("team_addesc2", {
								z: `<@${user}>`
							})
						)
						.setColor("#A4D0A4")
				],
				ephemeral: true
			});
		} else if (cmd == "remove") {
			const user = interaction.options.getUser("user").id;

			if (user == interaction.user.id)
				return interaction.reply({
					embeds: [
						new EmbedBuilder()
							.setTitle(tr("team_removefail"))
							.setDescription(tr("team_removeself"))
							.setThumbnail(
								"https://media.discordapp.net/attachments/1057244827688910850/1110552508369219584/discord_1.gif"
							)
							.setColor("#E06469")
					],
					ephemeral: true
				});

			if (await db.has(teamPath)) {
				const team = await db.get(teamPath);
				if (!team.includes(user))
					return interaction.reply({
						embeds: [
							new EmbedBuilder()
								.setThumbnail(
									"https://media.discordapp.net/attachments/1057244827688910850/1110552508369219584/discord_1.gif"
								)
								.setTitle(tr("team_removefail"))
								.setDescription(
									tr("team_removedesc", {
										z: `<@${user}>`
									})
								)
								.setColor("#E06469")
						],
						ephemeral: true
					});
			}

			await db.pull(teamPath, user);
			interaction.reply({
				embeds: [
					new EmbedBuilder()
						.setThumbnail(
							"https://media.discordapp.net/attachments/1057244827688910850/1110552199450333204/discord.gif"
						)
						.setTitle(tr("team_removesus"))
						.setDescription(
							tr("team_removedesc2", {
								z: `<@${user}>`
							})
						)
						.setColor("#A4D0A4")
				],
				ephemeral: true
			});
		} else if (cmd == "list") {
			let description = tr("none");
			if (await db.has(teamPath)) {
				const team = await db.get(teamPath);
				if (team.length != 0)
					description = team
						.map((id, i) => {
							return `\`${i + 1}\` ▪ <@${id}>`;
						})
						.join("\n");
			}
			interaction.reply({
				embeds: [
					new EmbedBuilder()
						.setThumbnail(
							interaction.user.displayAvatarURL({
								size: 4096,
								dynamic: true
							})
						)
						.setTitle(
							tr("team_list", {
								z: interaction.user.username
							})
						)
						.setDescription(description)
						.setColor("#FDCEDF")
				],
				ephemeral: true
			});
		}
	}
};
