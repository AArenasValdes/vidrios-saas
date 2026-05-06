export const formatCurrency = (
  value: number,
  locale = "es-CL",
  currency = "CLP"
) => {
  if (!Number.isFinite(value)) {
    return "$0";
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: currency === "CLP" ? 0 : 2,
    maximumFractionDigits: currency === "CLP" ? 0 : 2,
  }).format(value);
};
