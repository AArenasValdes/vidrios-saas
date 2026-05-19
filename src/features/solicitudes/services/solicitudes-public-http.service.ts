import "server-only";

type SlidingWindowRateLimiterOptions = {
  windowMs: number;
  maxRequests: number;
};

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
  const recentRequestsByKey = new Map<string, number[]>();

  function prune(windowStart: number) {
    for (const [key, timestamps] of recentRequestsByKey.entries()) {
      const recentRequests = timestamps.filter((timestamp) => timestamp > windowStart);

      if (recentRequests.length > 0) {
        recentRequestsByKey.set(key, recentRequests);
      } else {
        recentRequestsByKey.delete(key);
      }
    }
  }

  return {
    isRateLimited(key: string | null) {
      const normalizedKey = key?.trim() || "unknown";
      const now = Date.now();
      const windowStart = now - options.windowMs;

      prune(windowStart);

      const recentRequests = recentRequestsByKey.get(normalizedKey) ?? [];

      if (recentRequests.length >= options.maxRequests) {
        return true;
      }

      recentRequestsByKey.set(normalizedKey, [...recentRequests, now]);
      return false;
    },
  };
}
