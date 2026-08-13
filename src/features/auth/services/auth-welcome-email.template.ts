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
  const empresa = input.empresaNombre.trim() || "tu taller";
  const appUrl = resolvePublicAppUrl();
  const loginUrl = `${appUrl}/login`;
  const trialLabel = formatTrialDate(input.trialEndsAt);
  const subject = `${name}, bienvenido a Ventora`;

  const text = [
    `Hola ${name},`,
    "",
    `Tu cuenta de Ventora para ${empresa} ya esta lista.`,
    trialLabel
      ? `Tienes 15 dias gratis hasta el ${trialLabel}.`
      : "Tienes 15 dias gratis para probar Ventora sin tarjeta.",
    "",
    "Con Ventora puedes:",
    "- Cotizar desde el celular, tablet o computador",
    "- Enviar un PDF profesional por WhatsApp",
    "- Ordenar clientes y cotizaciones en un solo lugar",
    "- Agregar lineas para cubicacion y despiece si las necesitas",
    "",
    `Entra aqui: ${loginUrl}`,
    "",
    "Si necesitas ayuda para arrancar, responde este correo o escribenos por WhatsApp.",
    "",
    "Equipo Ventora",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:#050505;color:#e6e8eb;font-family:Segoe UI,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0b0f17;border:1px solid rgba(230,232,235,0.12);border-radius:24px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 12px;background:linear-gradient(180deg,#111827 0%,#0b0f17 100%);">
                <p style="margin:0 0 18px;color:#1e88ff;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">Ventora</p>
                <h1 style="margin:0;color:#ffffff;font-size:28px;line-height:1.15;letter-spacing:-0.03em;">Hola ${escapeHtml(name)}, tu cuenta ya está lista</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 8px;">
                <p style="margin:0 0 14px;color:#c9d1dc;font-size:16px;line-height:1.6;">
                  Bienvenido a Ventora para <strong style="color:#ffffff;">${escapeHtml(empresa)}</strong>.
                  Ya puedes cotizar, enviar PDF profesional y ordenar tu trabajo comercial desde cualquier dispositivo.
                </p>
                <p style="margin:0 0 18px;color:#c9d1dc;font-size:15px;line-height:1.6;">
                  ${
                    trialLabel
                      ? `Tu prueba gratis de <strong style="color:#ffffff;">15 días</strong> vence el <strong style="color:#ffffff;">${escapeHtml(trialLabel)}</strong>.`
                      : `Empiezas con <strong style="color:#ffffff;">15 días gratis</strong>, sin tarjeta.`
                  }
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;background:rgba(30,136,255,0.08);border:1px solid rgba(30,136,255,0.22);border-radius:16px;">
                  <tr>
                    <td style="padding:16px 18px;color:#d7e5ff;font-size:14px;line-height:1.55;">
                      Cotiza en terreno · Revisa en el taller · Envía por WhatsApp · Agrega líneas para cubicación si las necesitas
                    </td>
                  </tr>
                </table>
                <a href="${loginUrl}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#1e88ff;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">
                  Entrar a Ventora
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px 28px;">
                <p style="margin:0;color:#8a96a6;font-size:13px;line-height:1.55;">
                  Si necesitas ayuda para arrancar, responde este correo. Estamos para acompañarte.
                </p>
                <p style="margin:14px 0 0;color:#8a96a6;font-size:13px;">
                  Equipo Ventora
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
