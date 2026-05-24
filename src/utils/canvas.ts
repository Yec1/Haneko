import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import path from "path";
import https from "https";
import http from "http";
import type { NHentaiService } from "../services/NHentaiService";

// Register CJK font — prefer system Noto Sans CJK, fallback to bundled
const FONT_PATHS = [
  "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",   // Linux (Debian/Ubuntu server)
  "/System/Library/Fonts/PingFang.ttc",                        // macOS
  path.join(__dirname, "../../assets/fonts/NotoSansCJK.otf"),  // bundled fallback
];
let fontRegistered = false;
for (const fp of FONT_PATHS) {
  try {
    GlobalFonts.registerFromPath(fp, "CJK");
    fontRegistered = true;
    break;
  } catch {}
}
if (!fontRegistered) {
  // last resort: try registering each one silently
  FONT_PATHS.forEach(fp => { try { GlobalFonts.registerFromPath(fp, "CJK"); } catch {} });
}

const FONT_BODY = '"CJK", sans-serif';

const CARD_W = 160;
const CARD_H = 240;
const COLS = 5;
const ROWS = 4;
const PAD = 10;
const TITLE_H = 44;

export interface GridItem {
  id: number;
  num_pages: number;
  num_favorites: number;
  thumbPath: string; // relative path for CDN
  titleText: string;
  index: number; // 1-indexed display number
}

/** Fetch an image URL as a Buffer using native https module (avoids fetch() compatibility issues) */
async function fetchImageBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    mod.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
        "Referer": "https://nhentai.net/",
      },
    }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // follow redirect once
        fetchImageBuffer(res.headers.location).then(resolve).catch(reject);
        return;
      }
      if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

/**
 * Draws a 5×4 grid of gallery cards and returns a PNG buffer.
 */
export async function drawGalleryGrid(
  items: GridItem[],
  nh: NHentaiService,
): Promise<Buffer> {
  const count = Math.min(items.length, COLS * ROWS);
  const actualRows = Math.min(ROWS, Math.ceil(count / COLS));

  const canvasW = COLS * (CARD_W + PAD) + PAD;
  const canvasH = actualRows * (CARD_H + PAD) + PAD;

  const canvas = createCanvas(canvasW, canvasH);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#0d1117";
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Pre-fetch all images in parallel (fail gracefully)
  const imageBuffers = await Promise.all(
    items.slice(0, count).map(async (item, i) => {
      try {
        // thumbPath from list API: "galleries/XXXXX/thumb.webp"
        // t3 is the thumb CDN — hardcoded as fallback is fine
        const thumbCdn = "https://t3.nhentai.net";
        const imgUrl = `${thumbCdn}/${item.thumbPath}`;
        console.log(`[canvas] fetching thumb [${i}]: ${imgUrl}`);
        const buf = await fetchImageBuffer(imgUrl);
        console.log(`[canvas] thumb [${i}] ok, bytes=${buf.length}`);
        return buf;
      } catch (err) {
        console.error(`[canvas] thumb [${i}] failed:`, err);
        return null;
      }
    }),
  );

  for (let i = 0; i < count; i++) {
    const item = items[i]!;
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = PAD + col * (CARD_W + PAD);
    const y = PAD + row * (CARD_H + PAD);

    // Card background
    ctx.fillStyle = "#161b22";
    ctx.beginPath();
    roundRect(ctx, x, y, CARD_W, CARD_H, 8);
    ctx.fill();

    // Cover image
    const imgH = CARD_H - TITLE_H;
    const imgBuf = imageBuffers[i];
    if (imgBuf) {
      try {
        const img = await loadImage(imgBuf);
        ctx.save();
        ctx.beginPath();
        roundRect(ctx, x, y, CARD_W, imgH, 8);
        ctx.clip();
        const scale = Math.max(CARD_W / img.width, imgH / img.height);
        const sw = img.width * scale;
        const sh = img.height * scale;
        ctx.drawImage(img, x + (CARD_W - sw) / 2, y + (imgH - sh) / 2, sw, sh);
        ctx.restore();
      } catch {
        ctx.fillStyle = "#21262d";
        ctx.fillRect(x, y, CARD_W, imgH);
      }
    } else {
      ctx.fillStyle = "#21262d";
      ctx.fillRect(x, y, CARD_W, imgH);
    }

    // Number badge (top-left)
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(x + 4, y + 4, 26, 20);
    ctx.fillStyle = "#58a6ff";
    ctx.font = `bold 11px ${FONT_BODY}`;
    ctx.fillText(`${item.index}`, x + 8, y + 17);

    // Pages badge (top-right)
    const pText = `${item.num_pages}p`;
    ctx.font = `10px ${FONT_BODY}`;
    const pW = ctx.measureText(pText).width + 8;
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(x + CARD_W - pW - 4, y + 4, pW, 18);
    ctx.fillStyle = "#c9d1d9";
    ctx.fillText(pText, x + CARD_W - pW, y + 16);

    // Title area
    const titleY = y + CARD_H - TITLE_H;
    ctx.fillStyle = "rgba(13,17,23,0.95)";
    ctx.fillRect(x, titleY, CARD_W, TITLE_H);

    ctx.fillStyle = "#e6edf3";
    ctx.font = `10px ${FONT_BODY}`;
    const lines = wrapText(ctx, item.titleText, CARD_W - 8, 3);
    lines.forEach((line, li) => {
      ctx.fillText(line, x + 4, titleY + 12 + li * 12, CARD_W - 8);
    });
  }

  return canvas.toBuffer("image/png");
}

function roundRect(
  ctx: ReturnType<ReturnType<typeof createCanvas>["getContext"]>,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(
  ctx: ReturnType<ReturnType<typeof createCanvas>["getContext"]>,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
      if (lines.length >= maxLines) break;
    } else {
      current = test;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  const last = lines[lines.length - 1];
  if (last && ctx.measureText(last).width > maxWidth) {
    let truncated = last;
    while (ctx.measureText(truncated + "…").width > maxWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1);
    }
    lines[lines.length - 1] = truncated + "…";
  }
  return lines;
}
