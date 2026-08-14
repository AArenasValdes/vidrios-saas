import { resolvePublicAppUrl } from "@/utils/public-app-url";

export type WelcomeEmailContentInput = {
  nombre: string;
  empresaNombre: string;
  trialEndsAt?: string | null;
};

function firstName(nombre: string) {
  const cleaned = nombre.trim().replace(/\s+/g, " ");
  if (!cleaned) {
    return "hola";
  }

  return cleaned.split(" ")[0] ?? cleaned;
}

function formatTrialDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildWelcomeEmailContent(input: WelcomeEmailContentInput) {
  const name = firstName(input.nombre);
  const appUrl = resolvePublicAppUrl();
  const logoUrl = `${appUrl}/brand/ventora-logo-login-clean-dark.svg`;
  const firstQuoteUrl = `${appUrl}/cotizaciones/nueva`;
  const trialLabel = formatTrialDate(input.trialEndsAt);
  const subject = `Hola ${name}, tu cuenta está lista`;

  const trialEndLine = trialLabel
    ? `Tu prueba estará activa hasta el ${trialLabel}. Te avisaremos antes de que termine.`
    : "Tu prueba gratuita dura 15 días. Te avisaremos antes de que termine.";

  const text = [
    `Hola ${name}, tu cuenta está lista`,
    "",
    "Tu prueba gratuita de Ventora ya está activa. Tienes 15 días para crear cotizaciones profesionales desde el teléfono o computador.",
    "",
    "Para comenzar:",
    "1. Completa los datos de tu taller.",
    "2. Crea tu primera cotización.",
    "3. Descarga el PDF y envíalo por WhatsApp.",
    "",
    `Crear mi primera cotización: ${firstQuoteUrl}`,
    "",
    trialEndLine,
    "",
    "También podrás usar cubicación y pauta de corte cuando las necesites.",
    "",
    "¿Necesitas ayuda para comenzar? Responde este correo y te ayudaremos personalmente.",
    "",
    "Equipo Ventora",
    "ventorap.cl",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#050505;color:#e6e8eb;font-family:Segoe UI,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0b0f17;border:1px solid rgba(230,232,235,0.12);border-radius:24px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 16px;background:linear-gradient(180deg,#111827 0%,#0b0f17 100%);">
                <img
                  src="${logoUrl}"
                  width="148"
                  height="32"
                  alt="Ventora"
                  style="display:block;margin:0 0 22px;border:0;outline:none;text-decoration:none;"
                />
                <h1 style="margin:0;color:#ffffff;font-size:28px;line-height:1.15;letter-spacing:-0.03em;">Hola ${escapeHtml(name)}, tu cuenta está lista</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 8px;">
                <p style="margin:0 0 20px;color:#c9d1dc;font-size:16px;line-height:1.6;">
                  Tu prueba gratuita de Ventora ya está activa. Tienes <strong style="color:#ffffff;">15 días</strong> para crear cotizaciones profesionales desde el teléfono o computador.
                </p>
                <p style="margin:0 0 10px;color:#ffffff;font-size:15px;font-weight:700;line-height:1.5;">
                  Para comenzar:
                </p>
                <ol style="margin:0 0 24px;padding-left:20px;color:#c9d1dc;font-size:15px;line-height:1.7;">
                  <li style="margin-bottom:6px;">Completa los datos de tu taller.</li>
                  <li style="margin-bottom:6px;">Crea tu primera cotización.</li>
                  <li>Descarga el PDF y envíalo por WhatsApp.</li>
                </ol>
                <a href="${firstQuoteUrl}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#1e88ff;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">
                  Crear mi primera cotización
                </a>
                <p style="margin:24px 0 18px;color:#c9d1dc;font-size:15px;line-height:1.6;">
                  ${
                    trialLabel
                      ? `Tu prueba estará activa hasta el <strong style="color:#ffffff;">${escapeHtml(trialLabel)}</strong>. Te avisaremos antes de que termine.`
                      : "Tu prueba gratuita dura <strong style=\"color:#ffffff;\">15 días</strong>. Te avisaremos antes de que termine."
                  }
                </p>
                <p style="margin:0 0 22px;color:#8a96a6;font-size:14px;line-height:1.6;">
                  También podrás usar cubicación y pauta de corte cuando las necesites.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 28px;">
                <p style="margin:0 0 14px;color:#c9d1dc;font-size:14px;line-height:1.6;">
                  ¿Necesitas ayuda para comenzar? Responde este correo y te ayudaremos personalmente.
                </p>
                <p style="margin:0;color:#8a96a6;font-size:13px;line-height:1.55;">
                  Equipo Ventora<br />
                  <a href="${appUrl}" style="color:#1e88ff;text-decoration:none;">ventorap.cl</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html, text };
}
