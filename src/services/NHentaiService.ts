import type { NHGallery, NHGalleryListItem, NHGalleryListResponse, NHTag, NHTokens, NHCdnConfig, NHTagType, NHSortType } from "../types/nhentai";
import type { CustomDatabase } from "../utils/Database";
import { Logger } from "../utils/Logger";

const BASE = "https://nhentai.net/api/v2";
const logger = new Logger("NHentaiService");

export class NHentaiService {
  private accessToken: string;
  private refreshToken: string;
  private cdnConfig: NHCdnConfig | null = null;
  private db: CustomDatabase;

  // Global rate limiter: 1 req / 2s
  private requestQueue: Array<() => void> = [];
  private requestInterval: NodeJS.Timeout | null = null;
  private readonly MIN_INTERVAL_MS = 2000;

  constructor(db: CustomDatabase, accessToken: string, refreshToken: string) {
    this.db = db;
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  async init() {
    const saved = await this.db.get<NHTokens>("nh:tokens");
    if (saved) {
      this.accessToken = saved.access_token;
      this.refreshToken = saved.refresh_token;
    }
    this.cdnConfig = await this.fetchCdn();
    logger.success(`NHentaiService ready. CDN thumbs: ${this.cdnConfig?.thumbs}`);

    this.requestInterval = setInterval(() => {
      const next = this.requestQueue.shift();
      if (next) next();
    }, this.MIN_INTERVAL_MS);
  }

  destroy() {
    if (this.requestInterval) clearInterval(this.requestInterval);
  }

  // ─── Token management ────────────────────────────────────────────────────────

  private async refreshTokens(): Promise<void> {
    logger.info("Refreshing nhentai tokens...");
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "HanekoBot/4.0 (discord bot)" },
      body: JSON.stringify({ refresh_token: this.refreshToken }),
    });
    if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
    const data = await res.json() as NHTokens;
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;
    await this.db.set("nh:tokens", data);
    logger.success("Tokens refreshed and saved.");
  }

  // ─── Core fetch ──────────────────────────────────────────────────────────────

  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try { resolve(await fn()); } catch (e) { reject(e); }
      });
    });
  }

  private async apiFetch<T>(path: string, options?: RequestInit, retry = true): Promise<T> {
    return this.enqueue(async () => {
      const res = await fetch(`${BASE}${path}`, {
        ...options,
        headers: {
          "Authorization": `Bearer ${this.accessToken}`,
          "User-Agent": "HanekoBot/4.0 (discord bot)",
          ...(options?.headers ?? {}),
        },
      });

      if (res.status === 401 && retry) {
        await this.refreshTokens();
        return this.apiFetch<T>(path, options, false);
      }

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`nhentai API ${res.status}: ${text.slice(0, 200)}`);
      }

      return res.json() as Promise<T>;
    });
  }

  private async fetchCdn(): Promise<NHCdnConfig> {
    const res = await fetch(`${BASE}/cdn`, {
      headers: { "User-Agent": "HanekoBot/4.0 (discord bot)" },
    });
    if (!res.ok) {
      return { images: "https://i3.nhentai.net", thumbs: "https://t3.nhentai.net" };
    }
    const data = await res.json() as { image_servers?: string[]; thumb_servers?: string[] };
    return {
      images: data.image_servers?.[2] ?? "https://i3.nhentai.net",
      thumbs: data.thumb_servers?.[2] ?? "https://t3.nhentai.net",
    };
  }

  // ─── URL helpers ─────────────────────────────────────────────────────────────

  thumbUrl(gallery: NHGallery): string {
    const cdn = this.cdnConfig?.thumbs ?? "https://t3.nhentai.net";
    return `${cdn}/${gallery.thumbnail.path}`;
  }

  coverUrl(gallery: NHGallery): string {
    const cdn = this.cdnConfig?.images ?? "https://i3.nhentai.net";
    return `${cdn}/${gallery.cover.path}`;
  }

  imageUrl(path: string): string {
    const cdn = this.cdnConfig?.images ?? "https://i3.nhentai.net";
    return `${cdn}/${path}`;
  }

  // ─── Galleries ───────────────────────────────────────────────────────────────

  async getGalleries(opts: { page?: number; sort?: NHSortType; perPage?: number } = {}): Promise<NHGalleryListResponse> {
    const { page = 1, sort = "date", perPage = 25 } = opts;
    return this.apiFetch<NHGalleryListResponse>(`/galleries?page=${page}&sort=${sort}&per_page=${perPage}`);
  }

  async getRandomGallery(): Promise<NHGallery> {
    const res = await this.apiFetch<{ id: number }>("/galleries/random");
    return this.getGallery(res.id);
  }

  async getGallery(id: number): Promise<NHGallery> {
    return this.apiFetch<NHGallery>(`/galleries/${id}`);
  }

  async getRelated(id: number): Promise<NHGalleryListItem[]> {
    const res = await this.apiFetch<NHGalleryListResponse>(`/galleries/${id}/related`);
    return (res.result ?? []) as NHGalleryListItem[];
  }

  async searchGalleries(opts: { query: string; page?: number; sort?: NHSortType; perPage?: number }): Promise<NHGalleryListResponse> {
    const { query, page = 1, sort = "date", perPage = 25 } = opts;
    const q = encodeURIComponent(query);
    return this.apiFetch<NHGalleryListResponse>(`/search?query=${q}&sort=${sort}&page=${page}&per_page=${perPage}`);
  }

  // ─── Tags ─────────────────────────────────────────────────────────────────────

  async getTagsByIds(ids: number[]): Promise<NHTag[]> {
    if (ids.length === 0) return [];
    // Check cache first
    const uncached: number[] = [];
    const cached: NHTag[] = [];
    for (const id of ids) {
      const c = await this.db.get<NHTag>(`nh:tag:${id}`);
      if (c) cached.push(c);
      else uncached.push(id);
    }

    if (uncached.length > 0) {
      const res = await fetch(`${BASE}/tags/ids?ids=${uncached.join(",")}`, {
        headers: {
          "Authorization": `Bearer ${this.accessToken}`,
          "User-Agent": "HanekoBot/4.0 (discord bot)",
        },
      });
      if (res.ok) {
        const data = await res.json() as { tags: NHTag[] };
        for (const tag of (data.tags ?? [])) {
          await this.db.set(`nh:tag:${tag.id}`, tag);
          cached.push(tag);
        }
      }
    }

    return cached;
  }

  async searchTags(query: string, type?: NHTagType): Promise<NHTag[]> {
    const body: Record<string, string> = { query };
    if (type) body.type = type;
    const res = await fetch(`${BASE}/tags/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "HanekoBot/4.0 (discord bot)" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return [];
    const data = await res.json() as { tags: NHTag[] };
    return data.tags ?? [];
  }

  // ─── Blacklist filter ─────────────────────────────────────────────────────────

  filterBlacklisted(galleries: NHGallery[], blacklistIds: number[]): NHGallery[] {
    if (blacklistIds.length === 0) return galleries;
    const set = new Set(blacklistIds);
    return galleries.filter(g => !g.tags.some(t => set.has(t.id)));
  }

  // ─── Download ─────────────────────────────────────────────────────────────────

  async getDownloadUrl(galleryId: number, format: "zip" | "cbz" | "torrent" = "zip"): Promise<{ url: string; expires_at: number }> {
    return this.apiFetch<{ url: string; expires_at: number }>(`/galleries/${galleryId}/download?format=${format}`);
  }
}
