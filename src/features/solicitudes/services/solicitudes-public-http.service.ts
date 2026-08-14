import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { isIP } from "node:net";

type SlidingWindowRateLimiterOptions = {
  windowMs: number;
  maxRequests: number;
  namespace?: string;
};

type SlidingWindowRateLimiter = {
  isRateLimited(key: string | null): Promise<boolean>;
  mode: "upstash" | "memory" | "unavailable";
};

type InMemoryRateLimiterState = Map<string, number[]>;

let rateLimiterSequence = 0;
let upstashInitFailedLogged = false;
let sharedRedisClient: Redis | null | undefined;

export const DEFAULT_JSON_BODY_MAX_BYTES = 64 * 1024;

export class RequestBodyTooLargeError extends Error {
  constructor(readonly maxBytes: number) {
    super(`El cuerpo supera el limite de ${maxBytes} bytes.`);
    this.name = "RequestBodyTooLargeError";
  }
}

export class RateLimitUnavailableError extends Error {
  constructor() {
    super("El limitador distribuido no esta disponible.");
    this.name = "RateLimitUnavailableError";
  }
}

export function isRequestBodyTooLargeError(
  error: unknown
): error is RequestBodyTooLargeError {
  return error instanceof RequestBodyTooLargeError;
}

export function isRateLimitUnavailableError(
  error: unknown
): error is RateLimitUnavailableError {
  return error instanceof RateLimitUnavailableError;
}

function mustUseDistributedRateLimit() {
  return process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
}

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
  const isVercelRequest = process.env.VERCEL === "1";
  const trustLocalProxy =
    process.env.NODE_ENV === "test" ||
    process.env.VENTORA_TRUST_PROXY_IP_HEADERS === "true";
  const forwardedFor = isVercelRequest
    ? request.headers.get("x-vercel-forwarded-for") ??
      request.headers.get("x-forwarded-for")
    : trustLocalProxy
      ? request.headers.get("x-forwarded-for") ??
        request.headers.get("x-real-ip")
      : null;

  if (forwardedFor) {
    const candidate = forwardedFor.split(",")[0]?.trim() ?? "";
    return isIP(candidate) ? candidate : null;
  }

  return null;
}

export async function readRequestBodyWithLimit(
  request: Request,
  maxBytes: number
): Promise<Uint8Array> {
  const contentLength = request.headers.get("content-length");
  const declaredLength = contentLength ? Number(contentLength) : null;

  if (
    declaredLength !== null &&
    (!Number.isSafeInteger(declaredLength) || declaredLength < 0)
  ) {
    throw new RequestBodyTooLargeError(maxBytes);
  }

  if (declaredLength !== null && declaredLength > maxBytes) {
    throw new RequestBodyTooLargeError(maxBytes);
  }

  if (!request.body) {
    return new Uint8Array();
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;
      if (!value) continue;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new RequestBodyTooLargeError(maxBytes);
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return body;
}

export async function parseJsonObjectBody<T extends Record<string, unknown>>(
  request: Request,
  options: { maxBytes?: number } = {}
): Promise<T | null> {
  try {
    const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
    if (
      contentType &&
      !contentType.includes("application/json") &&
      !contentType.includes("+json")
    ) {
      return null;
    }

    const bytes = await readRequestBodyWithLimit(
      request,
      options.maxBytes ?? DEFAULT_JSON_BODY_MAX_BYTES
    );
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const parsed = JSON.parse(text);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    return parsed as T;
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      throw error;
    }

    return null;
  }
}

export async function parseBoundedFormData(
  request: Request,
  maxBytes: number
): Promise<FormData | null> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (
    !contentType.includes("multipart/form-data") &&
    !contentType.includes("application/x-www-form-urlencoded")
  ) {
    return null;
  }

  const bytes = await readRequestBodyWithLimit(request, maxBytes);
  const body = new Uint8Array(bytes.byteLength);
  body.set(bytes);
  const boundedRequest = new Request(request.url, {
    method: "POST",
    headers: request.headers,
    body: body.buffer,
  });

  try {
    return await boundedRequest.formData();
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
    if (mustUseDistributedRateLimit()) {
      return {
        mode: "unavailable" as const,
        async isRateLimited() {
          throw new RateLimitUnavailableError();
        },
      };
    }

    return createInMemoryRateLimiter(namespace, options);
  }

  const windowSeconds = Math.max(1, Math.ceil(options.windowMs / 1000));
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(options.maxRequests, `${windowSeconds} s`),
    prefix: namespace,
    analytics: false,
  });

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
            "[RateLimit] Fallo la verificacion con Upstash Redis.",
            error
          );
        }

        if (mustUseDistributedRateLimit()) {
          throw new RateLimitUnavailableError();
        }

        return createInMemoryRateLimiter(namespace, options).isRateLimited(
          normalizedKey
        );
      }
    },
  };
}
