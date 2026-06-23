import { Events, MessageFlags, type Interaction } from "discord.js";
import type { Event } from "../interfaces/Event";
import { Logger } from "../utils/Logger";
import { getBrowseContext } from "../utils/nhBrowseState";

const logger = new Logger("Interaction");
const PAGE_SIZE = 20;

type PermissionInfo = {
  ownerId: string;
  isPublic: boolean;
};

function getPermissionInfo(parts: string[]): PermissionInfo | null {
  const action = parts[1];

  if (action === "page") {
    const ownerId = parts[4];
    const pub = parts[5];
    if (!ownerId || !pub) return null;
    return { ownerId, isPublic: pub === "1" };
  }

  if (action === "jump") {
    const ownerId = parts[3];
    const pub = parts[4];
    if (!ownerId || !pub) return null;
    return { ownerId, isPublic: pub === "1" };
  }

  if (action === "fav") {
    const ownerId = parts[4];
    const pub = parts[5];
    if (!ownerId || !pub) return null;
    return { ownerId, isPublic: pub === "1" };
  }

  if (action === "related") {
    const ownerId = parts[3];
    const pub = parts[4];
    if (!ownerId || !pub) return null;
    return { ownerId, isPublic: pub === "1" };
  }

  if (action === "select" || action === "listpage" || action === "back") {
    const ownerId = parts[4];
    const pub = parts[5];
    if (!ownerId || !pub) return null;
    return { ownerId, isPublic: pub === "1" };
  }

  if (action === "dl") {
    const ownerId = parts[4];
    const pub = parts[5];
    if (!ownerId || !pub) return null;
    return { ownerId, isPublic: pub === "1" };
  }

  return null;
}

async function loadListContextData(nh: any, ctx: string, pageNum: number) {
  let galleries: any[] = [];
  let total = 0;

  if (ctx.startsWith("browse")) {
    const res = await nh.getGalleries({ page: pageNum, sort: "date" });
    galleries = res.result;
    total = res.total;
  } else if (ctx.startsWith("popular:")) {
    const sort = ctx.slice("popular:".length);
    const res = await nh.getGalleries({ page: pageNum, sort: sort as any });
    galleries = res.result;
    total = res.total;
  } else if (ctx.startsWith("search:")) {
    const [, sort = "date", ...queryParts] = ctx.split(":");
    const query = decodeURIComponent(queryParts.join(":"));
    const res = await nh.searchGalleries({ query, page: pageNum, sort: sort as any });
    galleries = res.result;
    total = res.total;
  } else if (ctx.startsWith("tag:")) {
    const [, type, ...nameParts] = ctx.split(":");
    const name = nameParts.join(":");
    const res = await nh.searchGalleries({ query: `${type}:"${name}"`, page: pageNum, sort: "date" });
    galleries = res.result;
    total = res.total;
  } else if (ctx.startsWith("related:")) {
    const galleryId = parseInt(ctx.slice("related:".length));
    galleries = await nh.getRelated(galleryId);
    total = galleries.length;
  }

  return { galleries, total };
}

export default {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction) {
    if (interaction.isChatInputCommand()) {
      const client = interaction.client as any;
      const command = client.commands?.get(interaction.commandName);
      if (!command) return;
      try {
        logger.command(`/${interaction.commandName} by ${interaction.user.tag}`);
        await command.execute(interaction);
      } catch (err) {
        logger.error(`Command error (${interaction.commandName}):`, err);
        const msg = {
          content: "❌ 執行指令時發生錯誤，請稍後再試。",
          flags: 64,
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
      return;
    }

    if (interaction.isButton() || interaction.isStringSelectMenu()) {
      const parts = interaction.customId.split(":");
      if (parts[0] !== "nh") return;

      const client = interaction.client as any;
      const { nh, db } = client;
      const clickerId = interaction.user.id;

      if (interaction.guildId) {
        const isChannelNsfw = (interaction.channel as any)?.nsfw;
        const nsfwUnlocked = db.nhGuildGetNsfwUnlock(interaction.guildId);
        if (!isChannelNsfw && !nsfwUnlocked) {
          await interaction.reply({
            content: "❌ 請在 NSFW 頻道操作這個按鈕",
            flags: MessageFlags.Ephemeral,
          }).catch(() => {});
          return;
        }
      }

      const permission = getPermissionInfo(parts);
      if (!permission) return;

      const { ownerId, isPublic } = permission;
      const isOwner = clickerId === ownerId;
      const isTeamMember = !isOwner && db.teamIncludes(ownerId, clickerId);

      if (!isPublic && !isOwner && !isTeamMember) {
        await interaction.reply({
          content: "❌ 你沒有權限操作此按鈕。若要操作他人的本子，對方需先將你加入團隊（`/team add`）。",
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
        return;
      }

      const action = parts[1];

      if (action === "page") {
        const isNoop = parts[parts.length - 1] === "noop";
        if (isNoop) {
          await interaction.deferUpdate().catch(() => {});
          return;
        }

        await interaction.deferUpdate().catch(() => {});
        const galleryId = parseInt(parts[2]!);
        const pageNum = parseInt(parts[3]!);
        const listId = parts[6];
        const listPage = parts[7] ? parseInt(parts[7]) : undefined;

        try {
          const { buildSingleGalleryReply } = require("../utils/nhDisplay");
          const gallery = await nh.getGallery(galleryId);
          const tags = gallery.tags ?? [];
          const reply = await buildSingleGalleryReply(gallery, tags, nh, db, ownerId, {
            page: pageNum,
            isPublic,
            source: listId && listPage ? { listId, listPage } : undefined,
          });
          await interaction.editReply(reply as any).catch(() => {});
        } catch (e: any) {
          await interaction.followUp({
            content: `❌ ${e?.message ?? "錯誤"}`,
            flags: MessageFlags.Ephemeral,
          }).catch(() => {});
        }
        return;
      }

      if (action === "jump") {
        await interaction.deferUpdate().catch(() => {});
        const galleryId = parseInt(parts[2]!);
        const pageNum = parseInt((interaction as any).values?.[0] ?? "1");
        const listId = parts[5];
        const listPage = parts[6] ? parseInt(parts[6]) : undefined;

        try {
          const { buildSingleGalleryReply } = require("../utils/nhDisplay");
          const gallery = await nh.getGallery(galleryId);
          const tags = gallery.tags ?? [];
          const reply = await buildSingleGalleryReply(gallery, tags, nh, db, ownerId, {
            page: pageNum,
            isPublic,
            source: listId && listPage ? { listId, listPage } : undefined,
          });
          await interaction.editReply(reply as any).catch(() => {});
        } catch (e: any) {
          await interaction.followUp({
            content: `❌ ${e?.message ?? "錯誤"}`,
            flags: MessageFlags.Ephemeral,
          }).catch(() => {});
        }
        return;
      }

      if (action === "fav") {
        await interaction.deferUpdate().catch(() => {});
        const op = parts[2]!;
        const galleryId = parseInt(parts[3]!);
        const targetUserId = clickerId;

        if (op === "add") {
          db.nhAddFavorite(targetUserId, galleryId);
          await interaction.followUp({
            content: `❤️ 已將 **#${galleryId}** 加入你的收藏。`,
            flags: MessageFlags.Ephemeral,
          }).catch(() => {});
        } else {
          db.nhRemoveFavorite(targetUserId, galleryId);
          await interaction.followUp({
            content: `💔 已從你的收藏移除 **#${galleryId}**。`,
            flags: MessageFlags.Ephemeral,
          }).catch(() => {});
        }
        return;
      }

      if (action === "related") {
        await interaction.deferUpdate().catch(() => {});
        const galleryId = parseInt(parts[2]!);

        try {
          const { buildGalleryListReply } = require("../utils/nhDisplay");
          let galleries = await nh.getRelated(galleryId);
          const guildId = interaction.guildId;
          if (guildId) {
            const guildBlacklist = db.nhGuildGetBlacklist(guildId);
            galleries = nh.filterBlacklisted(galleries, guildBlacklist.map((b: any) => b.tag_id));
          }
          if (!galleries.length) {
            await interaction.followUp({
              content: "沒有找到相關作品（或皆被伺服器黑名單過濾）。",
              flags: MessageFlags.Ephemeral,
            }).catch(() => {});
            return;
          }
          const listReply = await buildGalleryListReply(galleries, nh, {
            pageNum: 1,
            totalPages: 1,
            total: galleries.length,
            ownerId,
            context: `related:${galleryId}`,
            isPublic,
          });
          const content = isPublic ? `🔗 <@${clickerId}> 開啟了相關作品列表：` : undefined;
          await interaction.followUp({
            content,
            components: listReply.components as any,
            files: listReply.files,
            flags: listReply.flags,
          } as any).catch(() => {});
        } catch (e: any) {
          await interaction.followUp({
            content: `❌ ${e?.message ?? "錯誤"}`,
            flags: MessageFlags.Ephemeral,
          }).catch(() => {});
        }
        return;
      }

      if (action === "select") {
        await interaction.deferUpdate().catch(() => {});
        const listId = parts[2]!;
        const listPage = parseInt(parts[3] ?? "1");
        const galleryId = parseInt((interaction as any).values?.[0] ?? "0");
        if (!galleryId) return;

        try {
          const { buildSingleGalleryReply } = require("../utils/nhDisplay");
          const gallery = await nh.getGallery(galleryId);
          const tags = gallery.tags ?? [];
          const reply = await buildSingleGalleryReply(gallery, tags, nh, db, ownerId, {
            page: 1,
            isPublic,
            source: { listId, listPage },
          });
          const content = isPublic ? `📖 <@${clickerId}> 點選了本子：` : undefined;
          await interaction.editReply({ content, ...reply } as any).catch(() => {});
        } catch (e: any) {
          await interaction.followUp({
            content: `❌ ${e?.message ?? "錯誤"}`,
            flags: MessageFlags.Ephemeral,
          }).catch(() => {});
        }
        return;
      }

      if (action === "listpage" || action === "back") {
        await interaction.deferUpdate().catch(() => {});
        const listId = parts[2]!;
        const pageNum = parseInt(parts[3] ?? "1");
        const ctx = getBrowseContext(listId);

        if (!ctx) {
          await interaction.followUp({
            content: "❌ 無法返回原列表，可能已過期或機器人已重啟，請重新執行指令。",
            flags: MessageFlags.Ephemeral,
          }).catch(() => {});
          return;
        }

        try {
          const { buildGalleryListReply } = require("../utils/nhDisplay");
          let { galleries, total } = await loadListContextData(nh, ctx, pageNum);

          const guildId = interaction.guildId;
          if (guildId) {
            const guildBlacklist = db.nhGuildGetBlacklist(guildId);
            galleries = nh.filterBlacklisted(galleries, guildBlacklist.map((b: any) => b.tag_id));
          }

          if (!galleries.length) {
            await interaction.followUp({
              content: "沒有找到任何結果（或皆被伺服器黑名單過濾）。",
              flags: MessageFlags.Ephemeral,
            }).catch(() => {});
            return;
          }

          const totalPages = total ? Math.ceil(total / PAGE_SIZE) : 1;
          const listReply = await buildGalleryListReply(galleries, nh, {
            pageNum,
            totalPages,
            total,
            ownerId,
            context: ctx,
            isPublic,
          });
          await interaction.editReply({
            components: listReply.components as any,
            files: listReply.files,
            flags: listReply.flags,
          } as any).catch(() => {});
        } catch (e: any) {
          await interaction.followUp({
            content: `❌ ${e?.message ?? "錯誤"}`,
            flags: MessageFlags.Ephemeral,
          }).catch(() => {});
        }
        return;
      }

      if (action === "dl") {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
        const format = parts[2]! as "zip" | "cbz" | "torrent";
        const galleryId = parseInt(parts[3]!);
        try {
          const { url, expires_at } = await nh.getDownloadUrl(galleryId, format);
          const expiresStr = new Date(expires_at * 1000).toLocaleTimeString("zh-TW");
          await interaction.editReply({
            content: `📦 **#${galleryId}** 下載連結（${format.toUpperCase()}）\n${url}\n\n⏰ 有效至 ${expiresStr}`,
          }).catch(() => {});
        } catch (e: any) {
          const msg = e?.message ?? "錯誤";
          const hint = msg.includes("503") ? "此功能目前已停用（Feature Flag 未開啟）" : msg;
          await interaction.editReply({ content: `❌ ${hint}` }).catch(() => {});
        }
      }
    }
  },
} satisfies Event;
