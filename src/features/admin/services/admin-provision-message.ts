type BuildProvisionClientMessageInput = {
  empresaNombre: string;
  email: string;
  trialEndsAt: string | null;
};

function formatTrialEnd(value: string | null) {
  if (!value) {
    return "15 dias desde hoy";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "15 dias desde hoy";
  }

  return date.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function buildProvisionActivationText(input: {
  email: string;
}) {
  return `Correo: ${input.email}\nActivacion: enviada al correo. No se comparte ninguna contrasena.`;
}

export function buildProvisionWhatsAppMessage(input: BuildProvisionClientMessageInput) {
  const trialLabel = formatTrialEnd(input.trialEndsAt);

  return [
    "Hola! Tu cuenta Ventora ya esta lista.",
    "",
    `Empresa: ${input.empresaNombre}`,
    `Correo: ${input.email}`,
    "",
    "Te enviamos un correo de activacion de un solo uso para que definas tu acceso.",
    "Por seguridad, Ventora no envia contrasenas por WhatsApp.",
    "",
    `Prueba gratis 15 dias (Founder Full) hasta ${trialLabel}.`,
  ].join("\n");
}
