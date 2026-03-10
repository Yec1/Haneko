type AnyFn = (...args: any[]) => any;

const EPHEMERAL_FLAG = 64;

export class TtlCache<K = string, V = unknown> {
  private readonly ttlMs: number;
  private readonly maxSize: number;
  private readonly store = new Map<K, { value: V; expiresAt: number }>();
  private readonly inFlight = new Map<K, Promise<V>>();

  constructor(ttlMs = 60_000, maxSize = 5_000) {
    this.ttlMs = ttlMs;
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const item = this.store.get(key);
    if (!item) return undefined;

    if (item.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }

    return item.value;
  }

  set(key: K, value: V): void {
    if (this.store.size >= this.maxSize) {
      const firstKey = this.store.keys().next().value;
      if (firstKey !== undefined) {
        this.store.delete(firstKey);
      }
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  delete(key: K): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
    this.inFlight.clear();
  }

  async getOrSetAsync(key: K, loader: () => Promise<V>): Promise<V> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const existing = this.inFlight.get(key);
    if (existing) {
      return existing;
    }

    const pending = (async () => {
      try {
        const value = await loader();
        if (value !== undefined) {
          this.set(key, value);
        }
        return value;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, pending);
    return pending;
  }
}

export function fireAndForget(
  promise: Promise<unknown> | null | undefined,
  logger?: { error: (...args: unknown[]) => void }
): void {
  if (!promise || typeof (promise as any).then !== "function") return;

  promise.catch((error) => {
    if (logger && typeof logger.error === "function") {
      logger.error((error as any)?.message || String(error));
      return;
    }
    console.error(error);
  });
}

export function getCommandAckPlan(
  command: any,
  options: { defaultEphemeral?: boolean } = {}
): {
  shouldDefer: boolean;
  ephemeral: boolean;
  usesModal: boolean;
} {
  const defaultEphemeral = options.defaultEphemeral ?? true;
  const meta = command?.meta ?? {};

  const usesModal =
    command?.usesModal === true ||
    command?.showModal === true ||
    command?.opensModal === true ||
    meta.usesModal === true;

  const autoDefer =
    command?.autoDefer === true ||
    command?.defer === true ||
    meta.autoDefer === true;

  const ephemeral =
    command?.ephemeral ??
    command?.defaultEphemeral ??
    command?.autoDeferEphemeral ??
    meta.ephemeral ??
    meta.defaultEphemeral ??
    defaultEphemeral;

  return {
    shouldDefer: autoDefer && !usesModal,
    ephemeral: Boolean(ephemeral),
    usesModal,
  };
}

export async function ensureDeferredReply(
  interaction: any,
  ephemeral = true
): Promise<boolean> {
  if (!interaction || interaction.deferred || interaction.replied) {
    return false;
  }

  const options = ephemeral ? { flags: EPHEMERAL_FLAG } : {};
  await interaction.deferReply(options);
  return true;
}

export async function replyOrFollowUp(interaction: any, payload: any): Promise<any> {
  if (!interaction) return null;

  if (interaction.deferred || interaction.replied) {
    return interaction.followUp(payload);
  }

  return interaction.reply(payload);
}

export class CommandUsageTracker {
  private readonly stats = new Map<string, {
    count: number;
    lastUsedAt: number | null;
    totalExecutionMs: number;
    errors: number;
  }>();

  private readonly flushIntervalMs: number;
  private flushCallback: AnyFn | null = null;
  private flushTimer?: NodeJS.Timeout;

  constructor(flushIntervalMs = 60_000) {
    this.flushIntervalMs = flushIntervalMs;
    this.startAutoFlush();
  }

  track(commandName: string, executionMs = 0): void {
    const key = commandName || "unknown";
    const current = this.stats.get(key) || {
      count: 0,
      lastUsedAt: null,
      totalExecutionMs: 0,
      errors: 0,
    };

    current.count += 1;
    current.lastUsedAt = Date.now();
    current.totalExecutionMs += executionMs;

    this.stats.set(key, current);
  }

  trackError(commandName: string): void {
    const key = commandName || "unknown";
    const current = this.stats.get(key) || {
      count: 0,
      lastUsedAt: null,
      totalExecutionMs: 0,
      errors: 0,
    };
    current.errors += 1;
    this.stats.set(key, current);
  }

  getStats(commandName?: string): any {
    if (commandName) {
      return this.stats.get(commandName);
    }
    return Object.fromEntries(this.stats);
  }

  startAutoFlush(): void {
    this.flushTimer = setInterval(() => {
      if (this.flushCallback && this.stats.size > 0) {
        this.flushCallback(this.getStats());
        this.stats.clear();
      }
    }, this.flushIntervalMs);
  }

  onFlush(callback: AnyFn): void {
    this.flushCallback = callback;
  }

  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
  }
}

export class RateLimiter {
  private readonly maxRequestsPerSecond: number;
  private readonly userMaxPerMinute: number;
  private readonly globalWindowMs = 1000;
  private readonly userWindowMs = 60_000;

  private globalRequests: number[] = [];
  private readonly userRequests = new Map<string, number[]>();

  constructor(options: { maxRequestsPerSecond?: number; userMaxPerMinute?: number } = {}) {
    this.maxRequestsPerSecond = options.maxRequestsPerSecond || 100;
    this.userMaxPerMinute = options.userMaxPerMinute || 30;
  }

  checkGlobal(): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    this.globalRequests = this.globalRequests.filter((t) => now - t < this.globalWindowMs);

    if (this.globalRequests.length >= this.maxRequestsPerSecond) {
      return {
        allowed: false,
        retryAfter: Math.ceil((this.globalRequests[0] + this.globalWindowMs - now) / 1000),
      };
    }

    this.globalRequests.push(now);
    return { allowed: true };
  }

  checkUser(userId: string): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    let requests = this.userRequests.get(userId) || [];
    requests = requests.filter((t) => now - t < this.userWindowMs);

    if (requests.length >= this.userMaxPerMinute) {
      return {
        allowed: false,
        retryAfter: Math.ceil((requests[0] + this.userWindowMs - now) / 1000),
      };
    }

    requests.push(now);
    this.userRequests.set(userId, requests);
    return { allowed: true };
  }

  check(userId: string): { allowed: boolean; retryAfter?: number } {
    const global = this.checkGlobal();
    if (!global.allowed) return global;

    const user = this.checkUser(userId);
    if (!user.allowed) return user;

    return { allowed: true };
  }
}

export class CommandExecutor {
  private readonly defaultTimeoutMs: number;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly logger: { warn: AnyFn; error: AnyFn; success: AnyFn };

  constructor(options: {
    defaultTimeoutMs?: number;
    maxRetries?: number;
    retryDelayMs?: number;
    logger?: { warn: AnyFn; error: AnyFn; success: AnyFn };
  } = {}) {
    this.defaultTimeoutMs = options.defaultTimeoutMs || 30_000;
    this.maxRetries = options.maxRetries || 2;
    this.retryDelayMs = options.retryDelayMs || 1000;
    this.logger = options.logger || {
      warn: console.warn,
      error: console.error,
      success: console.log,
    };
  }

  async execute(
    commandName: string,
    executor: () => Promise<any>,
    options: { timeoutMs?: number; maxRetries?: number; retryDelayMs?: number } = {}
  ): Promise<any> {
    const timeoutMs = options.timeoutMs || this.defaultTimeoutMs;
    const maxRetries = options.maxRetries ?? this.maxRetries;
    const retryDelayMs = options.retryDelayMs || this.retryDelayMs;

    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.executeWithTimeout(executor, timeoutMs);
        if (attempt > 0) {
          this.logger.success(`${commandName} succeeded after ${attempt} retries`);
        }
        return result;
      } catch (error) {
        lastError = error;

        if (attempt < maxRetries) {
          const delay = retryDelayMs * Math.pow(2, attempt);
          this.logger.warn(
            `${commandName} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`,
            (error as any)?.message
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          this.logger.error(
            `${commandName} failed after ${maxRetries + 1} attempts:`,
            (error as any)?.message
          );
        }
      }
    }

    throw lastError;
  }

  private async executeWithTimeout(
    executor: () => Promise<any>,
    timeoutMs: number
  ): Promise<any> {
    return Promise.race([
      executor(),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`Command execution exceeded ${timeoutMs}ms timeout`)),
          timeoutMs
        )
      ),
    ]);
  }
}

export class MessageCache {
  private readonly cache = new Map<string, { data: any; expiresAt: number }>();
  private readonly ttlMs: number;
  private readonly maxSize: number;

  constructor(options: { ttlMs?: number; maxSize?: number } = {}) {
    this.ttlMs = options.ttlMs || 3600_000;
    this.maxSize = options.maxSize || 10_000;
  }

  get(messageId: string): any | undefined {
    const entry = this.cache.get(messageId);
    if (!entry || entry.expiresAt <= Date.now()) {
      this.cache.delete(messageId);
      return undefined;
    }
    return entry.data;
  }

  set(messageId: string, messageData: any): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(messageId, {
      data: messageData,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  setMultiple(messages: any[]): void {
    for (const message of messages) {
      const id = message?.id;
      if (id) {
        this.set(id, message);
      }
    }
  }

  deleteByAuthor(authorId: string): void {
    for (const [messageId, entry] of this.cache.entries()) {
      if (entry.data?.author?.id === authorId) {
        this.cache.delete(messageId);
      }
    }
  }

  deleteByChannel(channelId: string): void {
    for (const [messageId, entry] of this.cache.entries()) {
      if (entry.data?.channelId === channelId) {
        this.cache.delete(messageId);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  stats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }
}

export class EnhancedErrorHandler {
  private readonly recoveryStrategies = new Map<string, (error: any) => Promise<boolean>>();
  private readonly logger: { error: AnyFn; warn: AnyFn };
  private errorCallback: ((errorData: any) => Promise<void>) | null = null;

  constructor(options: { logger?: { error: AnyFn; warn: AnyFn } } = {}) {
    this.logger = options.logger || {
      error: console.error,
      warn: console.warn,
    };
  }

  registerRecoveryStrategy(errorType: string, handler: (error: any) => Promise<boolean>): void {
    this.recoveryStrategies.set(errorType, handler);
  }

  onError(callback: (errorData: any) => Promise<void>): void {
    this.errorCallback = callback;
  }

  async handle(error: Error, context: any = {}): Promise<{ recovered: boolean; error: any }> {
    const errorData = {
      message: error.message,
      stack: error.stack,
      code: (error as any).code,
      name: error.name,
      timestamp: new Date().toISOString(),
      context,
    };

    this.logger.error(`Error: ${error.message}`);

    if (this.errorCallback) {
      try {
        await this.errorCallback(errorData);
      } catch (callbackError) {
        this.logger.warn("Error callback failed:", callbackError);
      }
    }

    const strategy = this.recoveryStrategies.get(error.name);
    if (strategy) {
      try {
        const recovered = await strategy(error);
        if (recovered) {
          this.logger.warn(`Recovered from ${error.name}`);
          return { recovered: true, error: errorData };
        }
      } catch (recoveryError) {
        this.logger.error("Recovery strategy failed:", recoveryError);
      }
    }

    return { recovered: false, error: errorData };
  }

  createErrorResponse(error: Error, context: any = {}): any {
    return {
      success: false,
      error: {
        message: error.message,
        code: (error as any).code || "UNKNOWN_ERROR",
        context,
      },
      timestamp: new Date().toISOString(),
    };
  }
}

export class ConnectionPool {
  async close(): Promise<void> {
    return;
  }
}
