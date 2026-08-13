export const formatCurrency = (
  value: number,
  locale = "es-CL",
  currency = "CLP"
) => {
  if (!Number.isFinite(value)) {
    return "$0";
  }

  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  });

  return formatter.format(value);
};
