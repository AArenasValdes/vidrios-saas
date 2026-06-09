type BuildProvisionClientMessageInput = {
  appOrigin: string;
  empresaNombre: string;
  email: string;
  password: string;
  trialEndsAt: string | null;
};

function formatTrialEnd(value: string | null) {
  if (!value) {
    return "7 dias desde hoy";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "7 dias desde hoy";
  }

  return date.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function buildProvisionCredentialsText(input: {
  email: string;
  password: string;
}) {
  return `Correo: ${input.email}\nContrasena: ${input.password}`;
}

export function buildProvisionWhatsAppMessage(input: BuildProvisionClientMessageInput) {
  const loginUrl = `${input.appOrigin}/login`;
  const configUrl = `${input.appOrigin}/configuracion/empresa`;
  const trialLabel = formatTrialEnd(input.trialEndsAt);

  return [
    "Hola! Tu cuenta Ventora ya esta lista.",
    "",
    `Empresa: ${input.empresaNombre}`,
    `Correo: ${input.email}`,
    `Contrasena: ${input.password}`,
    "",
    `Entra aqui: ${loginUrl}`,
    `Completa tu empresa aqui: ${configUrl}`,
    "",
    `Prueba gratis 7 dias (Founder Full) hasta ${trialLabel}.`,
  ].join("\n");
}
