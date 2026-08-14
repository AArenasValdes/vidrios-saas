export function mapMercadoPagoUserMessage(message: string) {
  const normalized = message.trim().toLowerCase();

  if (normalized.includes("payer and collector cannot be the same user")) {
    return "No puedes suscribirte con la misma cuenta de Mercado Pago donde recibes los pagos de Ventora. Para probar, usa otra cuenta de Mercado Pago o pide a otra persona que complete el checkout.";
  }

  return message;
}
