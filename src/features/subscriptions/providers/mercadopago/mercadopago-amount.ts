import "server-only";

export function normalizeMercadoPagoTransactionAmount(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) {
      return Math.round(parsed);
    }
  }

  return null;
}
