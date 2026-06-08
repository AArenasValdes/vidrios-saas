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
  const isLimited = await registerRateLimiter.isRateLimited(ip);

  if (isLimited) {
    throw new Error("RATE_LIMITED");
  }
}
