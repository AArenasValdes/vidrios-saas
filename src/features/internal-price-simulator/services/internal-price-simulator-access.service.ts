function parseBooleanFlag(value: string | undefined) {
  if (!value?.trim()) {
    return false;
  }

  const normalized = value.trim().toLowerCase();

  return normalized === "true" || normalized === "1" || normalized === "yes";
}

export function isInternalPriceSimulatorEnabled(
  env: NodeJS.ProcessEnv = process.env
) {
  return parseBooleanFlag(env.NEXT_PUBLIC_ENABLE_INTERNAL_PRICE_SIMULATOR);
}

export function isInternalPriceSimulatorUser(
  userId: string | null | undefined,
  env: NodeJS.ProcessEnv = process.env
) {
  const allowedUserId = env.INTERNAL_ADMIN_USER_ID?.trim();

  if (!allowedUserId || !userId?.trim()) {
    return false;
  }

  return userId.trim() === allowedUserId;
}

export function canAccessInternalPriceSimulator(input: {
  userId: string | null | undefined;
  env?: NodeJS.ProcessEnv;
}) {
  const env = input.env ?? process.env;

  return (
    isInternalPriceSimulatorEnabled(env) &&
    isInternalPriceSimulatorUser(input.userId, env)
  );
}
