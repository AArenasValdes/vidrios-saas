export function normalizeMercadoPagoExternalReference(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

export function resolveMercadoPagoCheckoutUrl(resource: {
  init_point?: string | null;
  sandbox_init_point?: string | null;
}) {
  if (typeof resource.init_point === "string" && resource.init_point.trim()) {
    return resource.init_point;
  }

  if (
    typeof resource.sandbox_init_point === "string" &&
    resource.sandbox_init_point.trim()
  ) {
    return resource.sandbox_init_point;
  }

  return null;
}
