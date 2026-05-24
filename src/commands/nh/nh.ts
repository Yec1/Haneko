import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import type { Command } from "../../interfaces/Command";
import { checkCooldown, setCooldown } from "../../utils/cooldown";
import { buildSingleGalleryReply, buildGalleryListReply } from "../../utils/nhDisplay";

const PAGE_SIZE = 20;
const COOLDOWN_MS = 5000;

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("nh")
    .setDescription("nhentai 相關指令")
    // /nh random
    .addSubcommand(sub =>
      sub.setName("random").setDescription("隨機一本"))
    // /nh read
    .addSubcommand(sub =>
      sub.setName("read")
        .setDescription("查看指定本子")
        .addIntegerOption(o =>
          o.setName("id").setDescription("nhentai ID").setRequired(true).setMinValue(1)))
    // /nh browse
    .addSubcommand(sub =>
      sub.setName("browse")
        .setDescription("瀏覽最新上傳")
        .addIntegerOption(o =>
          o.setName("page").setDescription("頁碼（預設 1）").setMinValue(1)))
    // /nh search
    .addSubcommand(sub =>
      sub.setName("search")
        .setDescription("搜尋本子")
        .addStringOption(o =>
          o.setName("query").setDescription("關鍵字").setRequired(true))
        .addIntegerOption(o =>
          o.setName("page").setDescription("頁碼（預設 1）").setMinValue(1))
        .addStringOption(o =>
          o.setName("sort").setDescription("排序方式").addChoices(
            { name: "最新", value: "date" },
            { name: "熱門（全時）", value: "popular" },
            { name: "熱門（今日）", value: "popular-today" },
            { name: "熱門（本週）", value: "popular-week" },
          )))
    // /nh popular
    .addSubcommand(sub =>
      sub.setName("popular")
        .setDescription("熱門本子")
        .addStringOption(o =>
          o.setName("period").setDescription("時間範圍").addChoices(
            { name: "全時", value: "popular" },
            { name: "今日", value: "popular-today" },
            { name: "本週", value: "popular-week" },
          ))
        .addIntegerOption(o =>
          o.setName("page").setDescription("頁碼（預設 1）").setMinValue(1)))
    // /nh related
    .addSubcommand(sub =>
      sub.setName("related")
        .setDescription("查看相關作品")
        .addIntegerOption(o =>
          o.setName("id").setDescription("nhentai ID").setRequired(true).setMinValue(1)))
    // /nh download
    .addSubcommand(sub =>
      sub.setName("download")
        .setDescription("取得本子下載連結（短效 URL）")
        .addIntegerOption(o =>
          o.setName("id").setDescription("nhentai ID").setRequired(true).setMinValue(1))
        .addStringOption(o =>
          o.setName("format").setDescription("格式（預設 zip）").addChoices(
            { name: "ZIP", value: "zip" },
            { name: "CBZ", value: "cbz" },
            { name: "Torrent", value: "torrent" },
          )))
    // /nh tag
    .addSubcommand(sub =>
      sub.setName("tag")
        .setDescription("依 tag 瀏覽")
        .addStringOption(o =>
          o.setName("type").setDescription("Tag 類型").setRequired(true).addChoices(
            { name: "tag", value: "tag" },
            { name: "artist", value: "artist" },
            { name: "character", value: "character" },
            { name: "parody", value: "parody" },
            { name: "group", value: "group" },
          ))
        .addStringOption(o =>
          o.setName("name").setDescription("Tag 名稱").setRequired(true))
        .addIntegerOption(o =>
          o.setName("page").setDescription("頁碼（預設 1）").setMinValue(1)))
    // /nh me subcommands
    .addSubcommandGroup(group =>
      group.setName("me").setDescription("個人收藏與黑名單")
        .addSubcommand(sub =>
          sub.setName("favorites").setDescription("查看收藏清單")
            .addIntegerOption(o => o.setName("page").setDescription("頁碼").setMinValue(1)))
        .addSubcommand(sub =>
          sub.setName("favorites-random").setDescription("從收藏中隨機一本"))
        .addSubcommand(sub =>
          sub.setName("favorite-add")
            .setDescription("加入收藏")
            .addIntegerOption(o => o.setName("id").setDescription("nhentai ID").setRequired(true).setMinValue(1)))
        .addSubcommand(sub =>
          sub.setName("favorite-remove")
            .setDescription("移除收藏")
            .addIntegerOption(o => o.setName("id").setDescription("nhentai ID").setRequired(true).setMinValue(1)))
        .addSubcommand(sub =>
          sub.setName("blacklist").setDescription("查看黑名單 Tag"))
        .addSubcommand(sub =>
          sub.setName("blacklist-add")
            .setDescription("新增黑名單 Tag ID")
            .addIntegerOption(o => o.setName("tag_id").setDescription("Tag ID").setRequired(true).setMinValue(1)))
        .addSubcommand(sub =>
          sub.setName("blacklist-remove")
            .setDescription("移除黑名單 Tag ID")
            .addIntegerOption(o => o.setName("tag_id").setDescription("Tag ID").setRequired(true).setMinValue(1)))
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const cooldown = checkCooldown(`${interaction.user.id}:nh`, COOLDOWN_MS);
    if (cooldown) {
      await interaction.reply({ content: `⏳ 指令冷卻中，請等待 ${cooldown} 秒`, ephemeral: true });
      return;
    }

    const { nh, db } = interaction.client as any;
    const sub = interaction.options.getSubcommand(false);
    const group = interaction.options.getSubcommandGroup(false);
    const userId = interaction.user.id;

    await interaction.deferReply();

    try {
      // ── /nh random ──────────────────────────────────────
      if (sub === "random" && !group) {
        const gallery = await nh.getRandomGallery();
        const tags = gallery.tags ?? [];
        const reply = await buildSingleGalleryReply(gallery, tags, nh, db, userId);
        await interaction.editReply(reply as any);
        return;
      }

      // ── /nh read <id> ────────────────────────────────────
      if (sub === "read" && !group) {
        const id = interaction.options.getInteger("id", true);
        const gallery = await nh.getGallery(id);
        if (!gallery) {
          await interaction.editReply({ content: `找不到 #${id}` });
          return;
        }
        const tags = gallery.tags ?? [];
        const reply = await buildSingleGalleryReply(gallery, tags, nh, db, userId);
        await interaction.editReply(reply as any);
        return;
      }

      // ── /nh browse / popular / search / tag / related ───
      if (["browse", "popular", "search", "tag", "related"].includes(sub ?? "") && !group) {
        let galleries: any[] = [];
        let total = 0;
        let page = interaction.options.getInteger("page") ?? 1;

        if (sub === "browse") {
          const res = await nh.getGalleries({ page, sort: "date" });
          galleries = res.result; total = res.total;
        } else if (sub === "popular") {
          const period = (interaction.options.getString("period") ?? "popular") as any;
          const res = await nh.getGalleries({ page, sort: period });
          galleries = res.result; total = res.total;
        } else if (sub === "search") {
          const query = interaction.options.getString("query", true);
          const sort = (interaction.options.getString("sort") ?? "date") as any;
          const res = await nh.searchGalleries({ query, page, sort });
          galleries = res.result; total = res.total;
        } else if (sub === "tag") {
          const type = interaction.options.getString("type", true);
          const name = interaction.options.getString("name", true);
          const res = await nh.searchGalleries({ query: `${type}:"${name}"`, page, sort: "date" });
          galleries = res.result; total = res.total;
        } else if (sub === "related") {
          const id = interaction.options.getInteger("id", true);
          const res = await nh.getRelated(id);
          galleries = res; total = res.length;
        }

        if (!galleries.length) {
          await interaction.editReply({ content: "沒有找到任何結果。" });
          return;
        }

        const totalPages = Math.ceil(total / PAGE_SIZE);
        const listCtx = sub === "browse" ? "browse"
          : sub === "popular" ? `popular:${interaction.options.getString("period") ?? "popular"}`
          : sub === "search" ? `search:${interaction.options.getString("query") ?? ""}`
          : sub === "tag" ? `tag:${interaction.options.getString("type")}:${interaction.options.getString("name")}`
          : sub === "related" ? `related:${interaction.options.getInteger("id")}` : sub ?? "list";
        const listReply = await buildGalleryListReply(galleries, nh, {
          pageNum: page,
          totalPages,
          total,
          ownerId: userId,
          context: listCtx,
        });
        await interaction.editReply({ components: listReply.components as any, files: listReply.files, flags: listReply.flags } as any);
        return;
      }

      // ── /nh download ─────────────────────────────────────
      if (sub === "download") {
        await interaction.deferReply();
        const id = interaction.options.getInteger("id", true);
        const format = (interaction.options.getString("format") ?? "zip") as "zip" | "cbz" | "torrent";
        try {
          const { url, expires_at } = await nh.getDownloadUrl(id, format);
          const expiresStr = new Date(expires_at * 1000).toLocaleTimeString("zh-TW");
          await interaction.editReply({
            content: `📦 **#${id}** 下載連結（${format.toUpperCase()}）\n${url}\n\n⏰ 有效至 ${expiresStr}`,
          });
        } catch (e: any) {
          const msg = e?.message ?? "錯誤";
          const hint = msg.includes("503") ? "此功能目前已停用（Feature Flag 未開啟）" :
                       msg.includes("429") ? "下載請求過於頻繁，請稍後再試" : msg;
          await interaction.editReply({ content: `❌ ${hint}` });
        }
        return;
      }
      if (group === "me") {
        if (sub === "favorites") {
          const page = interaction.options.getInteger("page") ?? 1;
          const favIds = db.nhGetFavorites(userId);
          if (!favIds.length) {
            await interaction.editReply({ content: "你的收藏是空的。" });
            return;
          }
          const start = (page - 1) * PAGE_SIZE;
          const slice = favIds.slice(start, start + PAGE_SIZE);
          const galleries: any[] = [];
          for (const id of slice) {
            try { galleries.push(await nh.getGallery(id)); } catch {}
          }
          if (!galleries.length) {
            await interaction.editReply({ content: "無法讀取收藏。" });
            return;
          }
          const favReply = await buildGalleryListReply(galleries as any, nh, {
            pageNum: page,
            totalPages: Math.ceil(favIds.length / PAGE_SIZE),
            total: favIds.length,
            ownerId: userId,
            context: `favorites:${userId}`,
          });
          await interaction.editReply({ components: favReply.components as any, files: favReply.files, flags: favReply.flags } as any);
          return;
        }

        if (sub === "favorites-random") {
          const favIds = db.nhGetFavorites(userId);
          if (!favIds.length) {
            await interaction.editReply({ content: "你的收藏是空的。" });
            return;
          }
          const id = favIds[Math.floor(Math.random() * favIds.length)];
          const gallery = await nh.getGallery(id);
          const tags = gallery.tags ?? [];
          const reply = await buildSingleGalleryReply(gallery, tags, nh, db, userId);
          await interaction.editReply(reply as any);
          return;
        }

        if (sub === "favorite-add") {
          const id = interaction.options.getInteger("id", true);
          db.nhAddFavorite(userId, id);
          await interaction.editReply({ content: `✅ 已將 **#${id}** 加入收藏。` });
          return;
        }

        if (sub === "favorite-remove") {
          const id = interaction.options.getInteger("id", true);
          db.nhRemoveFavorite(userId, id);
          await interaction.editReply({ content: `🗑️ 已從收藏移除 **#${id}**。` });
          return;
        }

        if (sub === "blacklist") {
          const list = db.nhGetBlacklist(userId) as { tag_id: number; tag_name: string | null }[];
          if (!list.length) {
            await interaction.editReply({ content: "你的黑名單是空的。" });
            return;
          }
          const tagIds = list.map((r: any) => r.tag_id);
          const tags = await nh.getTagsByIds(tagIds);
          const tagMap = new Map<number, any>(tags.map((t: any) => [t.id, t]));
          const text = list.map((r: any) => {
            const tag = tagMap.get(r.tag_id);
            return tag ? `\`${tag.id}\` ${tag.name} (${tag.type})` : `\`${r.tag_id}\` ${r.tag_name ?? "Unknown"}`;
          }).join("\n");
          await interaction.editReply({ content: `🚫 **你的黑名單 Tag：**\n${text}` });
          return;
        }

        if (sub === "blacklist-add") {
          const tagId = interaction.options.getInteger("tag_id", true);
          db.nhAddBlacklist(userId, tagId);
          await interaction.editReply({ content: `✅ 已將 Tag ID \`${tagId}\` 加入黑名單。` });
          return;
        }

        if (sub === "blacklist-remove") {
          const tagId = interaction.options.getInteger("tag_id", true);
          db.nhRemoveBlacklist(userId, tagId);
          await interaction.editReply({ content: `✅ 已從黑名單移除 Tag ID \`${tagId}\`。` });
          return;
        }
      }

      await interaction.editReply({ content: "未知指令。" });
    } catch (err: any) {
      console.error("[nh command]", err);
      await interaction.editReply({ content: `❌ 發生錯誤：${err?.message ?? "未知"}` }).catch(() => {});
    }
  },
};

export default command;
