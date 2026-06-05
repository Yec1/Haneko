// Per-user 指令冷卻管理（in-memory，bot 重啟清空）
const cooldowns = new Map<string, number>();

/**
 * 檢查冷卻，返回剩餘秒數（0 = 可以用）
 * @param key 唯一 key，例如 `${userId}:nh` 或 `${userId}:nh:random`
 * @param cooldownMs 冷卻毫秒
 */
export function checkCooldown(key: string, cooldownMs: number): number {
  const last = cooldowns.get(key) ?? 0;
  const elapsed = Date.now() - last;
  if (elapsed < cooldownMs) {
    return Math.ceil((cooldownMs - elapsed) / 1000);
  }
  return 0;
}

/**
 * 設定冷卻（指令執行後呼叫）
 */
export function setCooldown(key: string): void {
  cooldowns.set(key, Date.now());
}

// 定期清理過期的冷卻記錄（避免 memory leak）
setInterval(() => {
  const now = Date.now();
  const MAX_COOLDOWN = 60_000;
  for (const [key, ts] of cooldowns) {
    if (now - ts > MAX_COOLDOWN) cooldowns.delete(key);
  }
}, 5 * 60 * 1000);
