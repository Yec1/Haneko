import { Events, MessageFlags, type Interaction } from "discord.js";
import type { Event } from "../interfaces/Event";
import { Logger } from "../utils/Logger";

const logger = new Logger("Interaction");

export default {
	name: Events.InteractionCreate,
	async execute(interaction: Interaction) {
		if (interaction.isChatInputCommand()) {
			const client = interaction.client as any;
			const command = client.commands?.get(interaction.commandName);
			if (!command) return;
			try {
				logger.command(
					`/${interaction.commandName} by ${interaction.user.tag}`
				);
				await command.execute(interaction);
			} catch (err) {
				logger.error(
					`Command error (${interaction.commandName}):`,
					err
				);
				const msg = {
					content: "❌ 執行指令時發生錯誤，請稍後再試。",
					flags: 64
				};
				if (interaction.replied || interaction.deferred) {
					await interaction.followUp(msg).catch(() => {});
				} else {
					await interaction.reply(msg).catch(() => {});
				}
			}
			return;
		}

		if (interaction.isAutocomplete()) {
			const client = interaction.client as any;
			const command = client.commands?.get(interaction.commandName);
			if (command?.autocomplete) {
				await command.autocomplete(interaction).catch(() => {});
			}
		}

		// Button interactions for nh
		if (interaction.isButton() || interaction.isStringSelectMenu()) {
			const parts = interaction.customId.split(":");
			const ns = parts[0];
			if (ns !== "nh") return;

			const client = interaction.client as any;
			const { nh, db } = client;
			const clickerId = interaction.user.id;

			// --- NSFW restriction check ---
			if (interaction.guildId) {
				const isChannelNsfw = (interaction.channel as any)?.nsfw;
				const nsfwUnlocked = db.nhGuildGetNsfwUnlock(
					interaction.guildId
				);
				if (!isChannelNsfw && !nsfwUnlocked) {
					await interaction
						.reply({
							content: "❌ 請在 NSFW 頻道操作這個按鈕",
							flags: MessageFlags.Ephemeral
						})
						.catch(() => {});
					return;
				}
			}

			// --- Team permission check ---
			// customId format: nh:{action}:...:{ownerId}:{pub}
			// pub = "1" means public (anyone can interact)
			const pub = parts[parts.length - 1];
			const isPublic = pub === "1";
			const ownerId = isPublic
				? parts[parts.length - 2]!
				: parts[parts.length - 1]!;
			const isOwner = clickerId === ownerId;
			const isTeamMember =
				!isOwner && db.teamIncludes(ownerId, clickerId);

			if (!isPublic && !isOwner && !isTeamMember) {
				await interaction
					.reply({
						content:
							"❌ 你沒有權限操作此按鈕。若要操作他人的本子，對方需先將你加入團隊（`/team add`）。",
						flags: MessageFlags.Ephemeral
					})
					.catch(() => {});
				return;
			}

			const action = parts[1];

			// nh:page:{galleryId}:{pageNum}:{ownerId}:{pub}
			if (action === "page") {
				if (parts[5] === "noop") {
					await interaction.deferUpdate().catch(() => {});
					return;
				}
				await interaction.deferUpdate().catch(() => {});
				const galleryId = parseInt(parts[2]!);
				const pageNum = parseInt(parts[3]!);
				try {
					const {
						buildSingleGalleryReply
					} = require("../utils/nhDisplay");
					const gallery = await nh.getGallery(galleryId);
					const tags = gallery.tags ?? [];
					const reply = await buildSingleGalleryReply(
						gallery,
						tags,
						nh,
						db,
						ownerId,
						{ page: pageNum, isPublic }
					);
					await interaction.editReply(reply as any).catch(() => {});
				} catch (e: any) {
					await interaction
						.followUp({
							content: `❌ ${e?.message ?? "錯誤"}`,
							flags: MessageFlags.Ephemeral
						})
						.catch(() => {});
				}
				return;
			}

			// nh:jump:{galleryId}:{ownerId}:{pub}  (select menu value = pageNum)
			if (action === "jump") {
				await interaction.deferUpdate().catch(() => {});
				const galleryId = parseInt(parts[2]!);
				const pageNum = parseInt(
					(interaction as any).values?.[0] ?? "1"
				);
				try {
					const {
						buildSingleGalleryReply
					} = require("../utils/nhDisplay");
					const gallery = await nh.getGallery(galleryId);
					const tags = gallery.tags ?? [];
					const reply = await buildSingleGalleryReply(
						gallery,
						tags,
						nh,
						db,
						ownerId,
						{ page: pageNum, isPublic }
					);
					await interaction.editReply(reply as any).catch(() => {});
				} catch (e: any) {
					await interaction
						.followUp({
							content: `❌ ${e?.message ?? "錯誤"}`,
							flags: MessageFlags.Ephemeral
						})
						.catch(() => {});
				}
				return;
			}

			if (action === "fav") {
				await interaction.deferUpdate().catch(() => {});
				const op = parts[2]!; // add | rm
				const galleryId = parseInt(parts[3]!);
				// Team members operate on their own favorites, not the owner's
				const targetUserId = clickerId;
				if (op === "add") {
					db.nhAddFavorite(targetUserId, galleryId);
					await interaction
						.followUp({
							content: `❤️ 已將 **#${galleryId}** 加入你的收藏。`,
							flags: MessageFlags.Ephemeral
						})
						.catch(() => {});
				} else {
					db.nhRemoveFavorite(targetUserId, galleryId);
					await interaction
						.followUp({
							content: `💔 已從你的收藏移除 **#${galleryId}**。`,
							flags: MessageFlags.Ephemeral
						})
						.catch(() => {});
				}
				return;
			}

			if (action === "related") {
				await interaction.deferUpdate().catch(() => {});
				const galleryId = parseInt(parts[2]!);
				try {
					const {
						buildGalleryListReply
					} = require("../utils/nhDisplay");
					let galleries = await nh.getRelated(galleryId);
					const guildId = interaction.guildId;
					if (guildId) {
						const guildBlacklist = db.nhGuildGetBlacklist(guildId);
						galleries = nh.filterBlacklisted(
							galleries,
							guildBlacklist.map((b: any) => b.tag_id)
						);
					}
					if (!galleries.length) {
						await interaction
							.followUp({
								content:
									"沒有找到相關作品（或皆被伺服器黑名單過濾）。",
								flags: MessageFlags.Ephemeral
							})
							.catch(() => {});
						return;
					}
					const listReply = await buildGalleryListReply(
						galleries,
						nh,
						{
							pageNum: 1,
							totalPages: 1,
							total: galleries.length,
							ownerId,
							context: `related:${galleryId}`,
							isPublic
						}
					);
					const content = isPublic
						? `🔗 <@${clickerId}> 開啟了相關作品列表：`
						: undefined;
					await interaction
						.followUp({
							content,
							components: listReply.components as any,
							files: listReply.files,
							flags: listReply.flags
						} as any)
						.catch(() => {});
				} catch (e: any) {
					await interaction
						.followUp({
							content: `❌ ${e?.message ?? "錯誤"}`,
							flags: MessageFlags.Ephemeral
						})
						.catch(() => {});
				}
			}

			// nh:select:{encodedCtx}:{ownerId}:{pub} — select a gallery from list
			if (action === "select") {
				await interaction.deferUpdate().catch(() => {});
				const galleryId = parseInt(
					(interaction as any).values?.[0] ?? "0"
				);
				if (!galleryId) return;
				try {
					const {
						buildSingleGalleryReply
					} = require("../utils/nhDisplay");
					const gallery = await nh.getGallery(galleryId);
					const tags = gallery.tags ?? [];
					const reply = await buildSingleGalleryReply(
						gallery,
						tags,
						nh,
						db,
						ownerId,
						{ page: 1, isPublic }
					);
					const content = isPublic
						? `📖 <@${clickerId}> 點選了本子：`
						: undefined;
					await interaction
						.editReply({ content, ...reply } as any)
						.catch(() => {});
				} catch (e: any) {
					await interaction
						.followUp({
							content: `❌ ${e?.message ?? "錯誤"}`,
							flags: MessageFlags.Ephemeral
						})
						.catch(() => {});
				}
				return;
			}

			// nh:listpage:{encodedCtx}:{pageNum}:{ownerId}:{pub}
			if (action === "listpage") {
				await interaction.deferUpdate().catch(() => {});
				const encodedCtx = parts[2]!;
				const pageNum = parseInt(parts[3]!);
				const ctx = decodeURIComponent(encodedCtx);
				try {
					const {
						buildGalleryListReply
					} = require("../utils/nhDisplay");
					let galleries: any[] = [];
					let total = 0;
					if (ctx.startsWith("browse")) {
						const res = await nh.getGalleries({
							page: pageNum,
							sort: "date"
						});
						galleries = res.result;
						total = res.total;
					} else if (ctx.startsWith("popular:")) {
						const sort = ctx.slice("popular:".length);
						const res = await nh.getGalleries({
							page: pageNum,
							sort: sort as any
						});
						galleries = res.result;
						total = res.total;
					} else if (ctx.startsWith("search:")) {
						const query = ctx.slice("search:".length);
						const res = await nh.searchGalleries({
							query,
							page: pageNum,
							sort: "date"
						});
						galleries = res.result;
						total = res.total;
					} else if (ctx.startsWith("tag:")) {
						const [, type, name] = ctx.split(":");
						const res = await nh.searchGalleries({
							query: `${type}:"${name}"`,
							page: pageNum,
							sort: "date"
						});
						galleries = res.result;
						total = res.total;
					}

					const guildId = interaction.guildId;
					if (guildId) {
						const guildBlacklist = db.nhGuildGetBlacklist(guildId);
						galleries = nh.filterBlacklisted(
							galleries,
							guildBlacklist.map((b: any) => b.tag_id)
						);
					}

					const totalPages = total ? Math.ceil(total / 20) : 1;
					const listReply = await buildGalleryListReply(
						galleries,
						nh,
						{
							pageNum,
							totalPages,
							total,
							ownerId,
							context: ctx,
							isPublic
						}
					);
					await interaction
						.editReply({
							components: listReply.components as any,
							files: listReply.files,
							flags: listReply.flags
						} as any)
						.catch(() => {});
				} catch (e: any) {
					await interaction
						.followUp({
							content: `❌ ${e?.message ?? "錯誤"}`,
							flags: MessageFlags.Ephemeral
						})
						.catch(() => {});
				}
				return;
			}

			if (action === "dl") {
				await interaction
					.deferReply({ flags: MessageFlags.Ephemeral })
					.catch(() => {});
				const format = parts[2]! as "zip" | "cbz" | "torrent";
				const galleryId = parseInt(parts[3]!);
				try {
					const { url, expires_at } = await nh.getDownloadUrl(
						galleryId,
						format
					);
					const expiresStr = new Date(
						expires_at * 1000
					).toLocaleTimeString("zh-TW");
					await interaction
						.editReply({
							content: `📦 **#${galleryId}** 下載連結（${format.toUpperCase()}）\n${url}\n\n⏰ 有效至 ${expiresStr}`
						})
						.catch(() => {});
				} catch (e: any) {
					const msg = e?.message ?? "錯誤";
					const hint = msg.includes("503")
						? "此功能目前已停用（Feature Flag 未開啟）"
						: msg;
					await interaction
						.editReply({ content: `❌ ${hint}` })
						.catch(() => {});
				}
			}
		}
	}
} satisfies Event;
