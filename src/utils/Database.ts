import Database from "better-sqlite3";

export class CustomDatabase {
  private db: Database.Database;

  constructor(filePath: string) {
    this.db = new Database(filePath);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS json (
        ID TEXT PRIMARY KEY,
        json TEXT
      );
      CREATE TABLE IF NOT EXISTS nh_favorites (
        discord_user_id TEXT NOT NULL,
        gallery_id INTEGER NOT NULL,
        added_at INTEGER NOT NULL DEFAULT (unixepoch()),
        PRIMARY KEY (discord_user_id, gallery_id)
      );
      CREATE TABLE IF NOT EXISTS nh_blacklist (
        discord_user_id TEXT NOT NULL,
        tag_id INTEGER NOT NULL,
        tag_name TEXT,
        PRIMARY KEY (discord_user_id, tag_id)
      );
      CREATE TABLE IF NOT EXISTS teams (
        owner_id TEXT NOT NULL,
        member_id TEXT NOT NULL,
        PRIMARY KEY (owner_id, member_id)
      );
    `);
  }

  // Generic KV
  async get<T = any>(key: string): Promise<T | null> {
    const row = this.db.prepare("SELECT json FROM json WHERE ID = ?").get(key) as { json: string } | undefined;
    if (!row) return null;
    try { return JSON.parse(row.json) as T; } catch { return row.json as unknown as T; }
  }

  async set(key: string, value: any): Promise<void> {
    this.db.prepare("INSERT OR REPLACE INTO json (ID, json) VALUES (?, ?)").run(key, JSON.stringify(value));
  }

  async delete(key: string): Promise<void> {
    this.db.prepare("DELETE FROM json WHERE ID = ?").run(key);
  }

  // NH Favorites
  nhAddFavorite(discordUserId: string, galleryId: number): void {
    this.db.prepare("INSERT OR IGNORE INTO nh_favorites (discord_user_id, gallery_id) VALUES (?, ?)").run(discordUserId, galleryId);
  }

  nhRemoveFavorite(discordUserId: string, galleryId: number): void {
    this.db.prepare("DELETE FROM nh_favorites WHERE discord_user_id = ? AND gallery_id = ?").run(discordUserId, galleryId);
  }

  nhGetFavorites(discordUserId: string): number[] {
    const rows = this.db.prepare("SELECT gallery_id FROM nh_favorites WHERE discord_user_id = ? ORDER BY added_at DESC").all(discordUserId) as { gallery_id: number }[];
    return rows.map(r => r.gallery_id);
  }

  nhIsFavorite(discordUserId: string, galleryId: number): boolean {
    return !!this.db.prepare("SELECT 1 FROM nh_favorites WHERE discord_user_id = ? AND gallery_id = ?").get(discordUserId, galleryId);
  }

  nhFavoritesCount(discordUserId: string): number {
    const row = this.db.prepare("SELECT COUNT(*) as cnt FROM nh_favorites WHERE discord_user_id = ?").get(discordUserId) as { cnt: number };
    return row.cnt;
  }

  // NH Blacklist
  nhAddBlacklist(discordUserId: string, tagId: number, tagName?: string): void {
    this.db.prepare("INSERT OR IGNORE INTO nh_blacklist (discord_user_id, tag_id, tag_name) VALUES (?, ?, ?)").run(discordUserId, tagId, tagName ?? null);
  }

  nhRemoveBlacklist(discordUserId: string, tagId: number): void {
    this.db.prepare("DELETE FROM nh_blacklist WHERE discord_user_id = ? AND tag_id = ?").run(discordUserId, tagId);
  }

  nhGetBlacklist(discordUserId: string): { tag_id: number; tag_name: string | null }[] {
    return this.db.prepare("SELECT tag_id, tag_name FROM nh_blacklist WHERE discord_user_id = ?").all(discordUserId) as { tag_id: number; tag_name: string | null }[];
  }

  nhBlacklistIds(discordUserId: string): number[] {
    const rows = this.nhGetBlacklist(discordUserId);
    return rows.map(r => r.tag_id);
  }

<<<<<<< HEAD
  // Guild Blacklist (using guild: prefix in discord_user_id)
  nhGuildAddBlacklist(guildId: string, tagId: number, tagName?: string): void {
    this.nhAddBlacklist(`guild:${guildId}`, tagId, tagName);
  }

  nhGuildRemoveBlacklist(guildId: string, tagId: number): void {
    this.nhRemoveBlacklist(`guild:${guildId}`, tagId);
  }

  nhGuildGetBlacklist(guildId: string): { tag_id: number; tag_name: string | null }[] {
    return this.nhGetBlacklist(`guild:${guildId}`);
  }

  // Guild NSFW Unlock
  nhGuildGetNsfwUnlock(guildId: string): boolean {
    const row = this.db.prepare("SELECT json FROM json WHERE ID = ?").get(`guild_nsfw_unlocked:${guildId}`) as { json: string } | undefined;
    if (!row) return false;
    return row.json === "true";
  }

  nhGuildSetNsfwUnlock(guildId: string, unlocked: boolean): void {
    this.db.prepare("INSERT OR REPLACE INTO json (ID, json) VALUES (?, ?)").run(`guild_nsfw_unlocked:${guildId}`, unlocked ? "true" : "false");
  }

=======
>>>>>>> d3ab5b8135c16d5a7e862c91f093a289cf9f6afb
  // Team management
  teamAdd(ownerId: string, memberId: string): void {
    this.db.prepare("INSERT OR IGNORE INTO teams (owner_id, member_id) VALUES (?, ?)").run(ownerId, memberId);
  }

  teamRemove(ownerId: string, memberId: string): void {
    this.db.prepare("DELETE FROM teams WHERE owner_id = ? AND member_id = ?").run(ownerId, memberId);
  }

  teamGet(ownerId: string): string[] {
    const rows = this.db.prepare("SELECT member_id FROM teams WHERE owner_id = ?").all(ownerId) as { member_id: string }[];
    return rows.map(r => r.member_id);
  }

  teamIncludes(ownerId: string, memberId: string): boolean {
    const row = this.db.prepare("SELECT 1 FROM teams WHERE owner_id = ? AND member_id = ?").get(ownerId, memberId);
    return !!row;
  }
}
