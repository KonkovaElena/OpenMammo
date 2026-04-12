export interface CaseIntakeRateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export interface CaseIntakeRateLimitDecision {
  applied: boolean;
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

interface RateLimitWindow {
  count: number;
  resetAtMs: number;
}

export class CaseIntakeRateLimiter {
  private readonly windows = new Map<string, RateLimitWindow>();

  constructor(private readonly config: CaseIntakeRateLimitConfig) {}

  evaluate(clientKey: string, nowMs = Date.now()): CaseIntakeRateLimitDecision {
    if (this.config.maxRequests <= 0) {
      return {
        applied: false,
        allowed: true,
        limit: 0,
        remaining: 0,
        retryAfterSeconds: 0,
      };
    }

    this.pruneExpiredWindows(nowMs);

    const normalizedKey = normalizeClientKey(clientKey);
    const currentWindow = this.windows.get(normalizedKey);

    if (!currentWindow) {
      this.windows.set(normalizedKey, {
        count: 1,
        resetAtMs: nowMs + this.config.windowMs,
      });

      return {
        applied: true,
        allowed: true,
        limit: this.config.maxRequests,
        remaining: Math.max(0, this.config.maxRequests - 1),
        retryAfterSeconds: Math.max(1, Math.ceil(this.config.windowMs / 1000)),
      };
    }

    if (currentWindow.count >= this.config.maxRequests) {
      return {
        applied: true,
        allowed: false,
        limit: this.config.maxRequests,
        remaining: 0,
        retryAfterSeconds: secondsUntil(currentWindow.resetAtMs, nowMs),
      };
    }

    currentWindow.count += 1;

    return {
      applied: true,
      allowed: true,
      limit: this.config.maxRequests,
      remaining: Math.max(0, this.config.maxRequests - currentWindow.count),
      retryAfterSeconds: secondsUntil(currentWindow.resetAtMs, nowMs),
    };
  }

  private pruneExpiredWindows(nowMs: number): void {
    for (const [clientKey, windowState] of this.windows.entries()) {
      if (windowState.resetAtMs <= nowMs) {
        this.windows.delete(clientKey);
      }
    }
  }
}

function normalizeClientKey(clientKey: string): string {
  const trimmed = clientKey.trim();
  return trimmed.length > 0 ? trimmed : "unknown";
}

function secondsUntil(resetAtMs: number, nowMs: number): number {
  return Math.max(1, Math.ceil((resetAtMs - nowMs) / 1000));
}