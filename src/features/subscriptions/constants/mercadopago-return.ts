export const MERCADOPAGO_RETURN_QUERY_PARAM = "mp";
export const MERCADOPAGO_RETURN_QUERY_VALUE = "confirming";

export function buildMercadoPagoReturnPath() {
  return `/dashboard?${MERCADOPAGO_RETURN_QUERY_PARAM}=${MERCADOPAGO_RETURN_QUERY_VALUE}`;
}

export function buildMercadoPagoReturnUrl(publicAppUrl: string) {
  return `${publicAppUrl}${buildMercadoPagoReturnPath()}`;
}
