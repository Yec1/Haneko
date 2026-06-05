import type { NHGallery, NHGalleryListItem, NHTag } from "../types/nhentai";
import type { NHentaiService } from "../services/NHentaiService";
import type { CustomDatabase } from "./Database";
import { drawGalleryGrid, type GridItem } from "./canvas";
import { AttachmentBuilder } from "discord.js";

const TAG_EMOJIS: Record<string, string> = {
  parody: "📺",
  character: "👤",
  artist: "🎨",
  group: "🏢",
  language: "🌐",
  category: "📁",
  tag: "🏷️",
};

export function galleryUrl(id: number) {
  return `https://nhentai.net/g/${id}/`;
}

export function formatTagSection(tags: NHTag[]): string {
  const groups: Record<string, string[]> = {};
  for (const tag of tags) {
    (groups[tag.type] ??= []).push(tag.name);
  }
  const order = ["parody", "character", "artist", "group", "language", "category", "tag"];
  return order
    .filter(t => groups[t])
    .map(t => `${TAG_EMOJIS[t] ?? "🏷️"} **${t}:** ${groups[t]!.join(", ")}`)
    .join("\n");
}

/**
 * Build select menu options centered around currentPage ±12 (max 25).
 */
function buildJumpOptions(galleryId: number, ownerId: string, currentPage: number, totalPages: number, pub: string) {
  const MAX = 25;
  const HALF = 12;

  let start = currentPage - HALF;
  let end = currentPage + HALF;

  if (start < 1) { start = 1; end = Math.min(MAX, totalPages); }
  if (end > totalPages) { end = totalPages; start = Math.max(1, end - MAX + 1); }

  const options: object[] = [];
  for (let p = start; p <= end; p++) {
    options.push({
      label: `第 ${p} 頁`,
      value: `${p}`,
      default: p === currentPage,
    });
  }
  return options;
}

/**
 * Build a Components V2 reply for a single gallery with page navigation.
 * page is 1-indexed.
 */
export async function buildSingleGalleryReply(
  gallery: NHGallery,
  tags: NHTag[],
  nh: NHentaiService,
  db: CustomDatabase,
  userId: string,
  opts: { ephemeral?: boolean; page?: number; isPublic?: boolean } = {},
) {
  const { ephemeral = false, page = 1, isPublic = false } = opts;
  const pub = isPublic ? "1" : "0";
  const totalPages = gallery.pages?.length ?? gallery.num_pages;
  const currentPage = Math.max(1, Math.min(page, totalPages));

  // Image URL for current page
  let imageUrl: string;
  if (gallery.pages && gallery.pages[currentPage - 1]) {
    imageUrl = nh.imageUrl(gallery.pages![currentPage - 1]!.path);
  } else {
    imageUrl = nh.thumbUrl(gallery);
  }

  const isFav = db.nhIsFavorite(userId, gallery.id);
  const title = gallery.title.english || gallery.title.japanese || gallery.title.pretty || `#${gallery.id}`;

  const titleText = `## [${title}](${galleryUrl(gallery.id)})\n\`#${gallery.id}\`  •  📄 **${gallery.num_pages}** 頁  •  ❤️ **${gallery.num_favorites}**`;
  const tagsText = tags.length > 0 ? formatTagSection(tags) : null;

  let flags = 1 << 15;
  if (ephemeral) flags |= 64;

  const jumpOptions = buildJumpOptions(gallery.id, userId, currentPage, totalPages, pub);

  const innerComponents: object[] = [
    {
      type: 10,
      content: titleText,
    },
    {
      type: 12, // MediaGallery
      items: [{ media: { url: imageUrl } }],
    },
    { type: 14, divider: true, spacing: 1 },
    {
      type: 1,
      components: [
        {
          type: 2,
          custom_id: `nh:page:${gallery.id}:${currentPage - 1}:${userId}:${pub}`,
          label: "◀",
          style: 2,
          disabled: currentPage <= 1,
        },
        {
          type: 2,
          custom_id: `nh:page:${gallery.id}:${currentPage}:${userId}:${pub}:noop`,
          label: `${currentPage} / ${totalPages}`,
          style: 2,
          disabled: true,
        },
        {
          type: 2,
          custom_id: `nh:page:${gallery.id}:${currentPage + 1}:${userId}:${pub}`,
          label: "▶",
          style: 2,
          disabled: currentPage >= totalPages,
        },
      ],
    },
    ...(jumpOptions.length > 1 ? [{
      type: 1,
      components: [{
        type: 3,
        custom_id: `nh:jump:${gallery.id}:${userId}:${pub}`,
        placeholder: `跳至頁面（共 ${totalPages} 頁）`,
        options: jumpOptions,
      }],
    }] : []),
    ...(tagsText ? [{ type: 14, divider: true, spacing: 1 }, { type: 10, content: tagsText }] : []),
    { type: 14, divider: true, spacing: 1 },
    {
      type: 1,
      components: [
        {
          type: 2,
          custom_id: `nh:fav:${isFav ? "rm" : "add"}:${gallery.id}:${userId}:${pub}`,
          label: isFav ? "取消收藏" : "加入收藏",
          emoji: { name: isFav ? "💔" : "❤️" },
          style: isFav ? 4 : 3,
        },
        {
          type: 2,
          custom_id: `nh:related:${gallery.id}:${userId}:${pub}`,
          label: "相關作品",
          emoji: { name: "🔗" },
          style: 2,
        },
        {
          type: 2,
          custom_id: `nh:dl:zip:${gallery.id}:${userId}:${pub}`,
          label: "下載 ZIP",
          emoji: { name: "📦" },
          style: 2,
        },
      ],
    },
  ];

  const components: object[] = [
    {
      type: 17,
      components: innerComponents,
    },
  ];

  return { components, flags };
}

/**
 * Build a gallery list reply: canvas 5×4 grid image + SelectMenu to pick a gallery.
 */
export async function buildGalleryListReply(
  galleries: NHGalleryListItem[],
  nh: NHentaiService,
  opts: {
    ephemeral?: boolean;
    pageNum?: number;
    totalPages?: number;
    total?: number;
    ownerId: string;
    context: string;
    isPublic?: boolean;
  },
) {
  const { ephemeral = false, pageNum = 1, totalPages = 1, total = 0, ownerId, context, isPublic = false } = opts;
  const pub = isPublic ? "1" : "0";

  const slice = galleries.slice(0, 20);
  const items: GridItem[] = slice.map((g, i) => {
    const titleText =
      (g as any).title?.english ||
      (g as any).title?.japanese ||
      (g as any).title?.pretty ||
      (g as any).english_title ||
      (g as any).japanese_title ||
      `#${g.id}`;
    const thumbPath =
      typeof (g as any).thumbnail === "string"
        ? (g as any).thumbnail
        : (g as any).thumbnail?.path || (g as any).cover?.path || "";
    return {
      id: g.id,
      num_pages: (g as any).num_pages ?? 0,
      num_favorites: (g as any).num_favorites ?? 0,
      thumbPath,
      titleText,
      index: i + 1,
    };
  });

  const buf = await drawGalleryGrid(items, nh);
  const attachment = new AttachmentBuilder(buf, { name: "nh-grid.png" });

  const selectOptions = items.map((item) => ({
    label: `${item.index}. #${item.id}`,
    description: item.titleText.slice(0, 50) || `#${item.id}`,
    value: `${item.id}`,
  }));

  let flags = 1 << 15;
  if (ephemeral) flags |= 64;

  const encodedCtx = encodeURIComponent(context).slice(0, 60);

  const components: object[] = [
    {
      type: 17,
      components: [
        {
          type: 10,
          content: `📋 第 **${pageNum}** 頁 / 共 **${totalPages}** 頁（${total} 本）`,
        },
        {
          type: 12,
          items: [{ media: { url: "attachment://nh-grid.png" } }],
        },
        { type: 14, divider: true, spacing: 1 },
        {
          type: 1,
          components: [
            {
              type: 3,
              custom_id: `nh:select:${encodedCtx}:${ownerId}:${pub}`,
              placeholder: "選擇一本查看詳情",
              options: selectOptions,
            },
          ],
        },
        ...(totalPages > 1 ? [
          { type: 14, divider: true, spacing: 1 },
          {
            type: 1,
            components: [
              {
                type: 2,
                custom_id: `nh:listpage:${encodedCtx}:${pageNum - 1}:${ownerId}:${pub}`,
                label: "◀ 上一頁",
                style: 2,
                disabled: pageNum <= 1,
              },
              {
                type: 2,
                custom_id: `nh:listpage:${encodedCtx}:${pageNum + 1}:${ownerId}:${pub}`,
                label: "下一頁 ▶",
                style: 2,
                disabled: pageNum >= totalPages,
              },
            ],
          },
        ] : []),
      ],
    },
  ];

  return { components, flags, files: [attachment] };
}
