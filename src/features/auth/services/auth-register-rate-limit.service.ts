import { createHash } from "node:crypto";

import {
  createSlidingWindowRateLimiter,
  resolveRequestIp,
} from "@/features/solicitudes/services/solicitudes-public-http.service";

const registerRateLimiter = createSlidingWindowRateLimiter({
  namespace: "auth-register",
  windowMs: 60 * 60 * 1000,
  maxRequests: 8,
});

export async function assertAuthRegisterRateLimit(request: Request) {
  const ip = resolveRequestIp(request);
  const userAgent = request.headers.get("user-agent")?.trim() ?? "unknown";
  const fallbackFingerprint = createHash("sha256")
    .update(userAgent)
    .digest("hex")
    .slice(0, 24);
  const isLimited = await registerRateLimiter.isRateLimited(
    ip ? `ip:${ip}` : `fingerprint:${fallbackFingerprint}`
  );

  if (isLimited) {
    throw new Error("RATE_LIMITED");
  }
}

export async function assertAuthRegisterIdentityRateLimit(identity: string) {
  const normalizedIdentity = identity.trim().toLowerCase();
  if (!normalizedIdentity) return;

  const digest = createHash("sha256")
    .update(normalizedIdentity)
    .digest("hex")
    .slice(0, 32);
  const isLimited = await registerRateLimiter.isRateLimited(
    `identity:${digest}`
  );

  if (isLimited) {
    throw new Error("RATE_LIMITED");
  }
}
