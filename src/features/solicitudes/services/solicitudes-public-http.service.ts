import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type SlidingWindowRateLimiterOptions = {
  windowMs: number;
  maxRequests: number;
  namespace?: string;
};

type SlidingWindowRateLimiter = {
  isRateLimited(key: string | null): Promise<boolean>;
  mode: "upstash" | "memory";
};

type InMemoryRateLimiterState = Map<string, number[]>;

let rateLimiterSequence = 0;
let upstashFallbackLogged = false;
let upstashInitFailedLogged = false;
let sharedRedisClient: Redis | null | undefined;

const inMemoryRateLimiterStates = new Map<string, InMemoryRateLimiterState>();

function getRateLimitNamespace(options: SlidingWindowRateLimiterOptions) {
  return (
    options.namespace?.trim() ||
    `solicitudes-publicas:${options.windowMs}:${options.maxRequests}:${++rateLimiterSequence}`
  );
}

function getUpstashRedisClient() {
  if (sharedRedisClient !== undefined) {
    return sharedRedisClient;
  }

  const url =
    process.env.UPSTASH_REDIS_REST_URL?.trim() ||
    process.env.KV_REST_API_URL?.trim() ||
    "";
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ||
    process.env.KV_REST_API_TOKEN?.trim() ||
    "";

  if (!url || !token) {
    sharedRedisClient = null;

    if (!upstashFallbackLogged) {
      upstashFallbackLogged = true;
      console.warn(
        "[RateLimit] Upstash Redis no esta configurado. Se usara un rate limiter local en memoria, sin cobertura entre instancias."
      );
    }

    return sharedRedisClient;
  }

  sharedRedisClient = new Redis({
    url,
    token,
  });

  return sharedRedisClient;
}

function createInMemoryRateLimiter(
  namespace: string,
  options: SlidingWindowRateLimiterOptions
): SlidingWindowRateLimiter {
  const state =
    inMemoryRateLimiterStates.get(namespace) ?? new Map<string, number[]>();
  inMemoryRateLimiterStates.set(namespace, state);

  return {
    mode: "memory",
    async isRateLimited(key: string | null) {
      const normalizedKey = key?.trim() || "unknown";
      const now = Date.now();
      const windowStart = now - options.windowMs;
      const recentRequests = (state.get(normalizedKey) ?? []).filter(
        (timestamp) => timestamp > windowStart
      );

      if (recentRequests.length >= options.maxRequests) {
        state.set(normalizedKey, recentRequests);
        return true;
      }

      state.set(normalizedKey, [...recentRequests, now]);
      return false;
    },
  };
}

export function resolveRequestIp(request: Request) {
  const cfConnectingIp = request.headers.get("cf-connecting-ip");

  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }

  const realIp = request.headers.get("x-real-ip");

  if (realIp) {
    return realIp.trim();
  }

  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    const segments = forwardedFor.split(",").map((segment) => segment.trim()).filter(Boolean);
    let trustedIndex = segments.length - 1;

    if (trustedIndex >= 0 && segments[trustedIndex] === "127.0.0.1") {
      trustedIndex -= 1;
    }

    return segments[Math.max(0, trustedIndex)] ?? null;
  }

  return null;
}

export async function parseJsonObjectBody<T extends Record<string, unknown>>(
  request: Request
): Promise<T | null> {
  try {
    const parsed = await request.json();

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    return parsed as T;
  } catch {
    return null;
  }
}

export function createSlidingWindowRateLimiter(
  options: SlidingWindowRateLimiterOptions
) {
  const namespace = getRateLimitNamespace(options);
  const redis = getUpstashRedisClient();

  if (!redis) {
    return createInMemoryRateLimiter(namespace, options);
  }

  const windowSeconds = Math.max(1, Math.ceil(options.windowMs / 1000));
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(options.maxRequests, `${windowSeconds} s`),
    prefix: namespace,
    analytics: false,
  });

  const fallback = createInMemoryRateLimiter(namespace, options);

  return {
    mode: "upstash" as const,
    async isRateLimited(key: string | null) {
      const normalizedKey = key?.trim() || "unknown";

      try {
        const result = await limiter.limit(normalizedKey);
        return !result.success;
      } catch (error) {
        if (!upstashInitFailedLogged) {
          upstashInitFailedLogged = true;
          console.error(
            "[RateLimit] Fallo la verificacion con Upstash Redis. Se usara fallback local en memoria.",
            error
          );
        }

        return fallback.isRateLimited(normalizedKey);
      }
    },
  };
}
