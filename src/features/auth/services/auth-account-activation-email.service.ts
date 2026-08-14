import "server-only";

import {
  emailService,
  isTransactionalEmailConfigured,
} from "@/features/notificaciones/services/email-notifications.service";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function validateActivationLink(value: string) {
  const activationUrl = new URL(value);
  const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);

  if (
    activationUrl.protocol !== "https:" ||
    activationUrl.hostname !== supabaseUrl.hostname
  ) {
    throw new Error("El enlace de activacion no pertenece al proyecto Ventora.");
  }

  return activationUrl.toString();
}

export async function sendAccountActivationEmail(input: {
  to: string;
  empresaNombre: string;
  actionLink: string;
}) {
  if (!isTransactionalEmailConfigured()) {
    return { sent: false as const, reason: "email_not_configured" as const };
  }

  const to = input.to.trim().toLowerCase();
  const empresaNombre = input.empresaNombre.trim() || "tu empresa";
  const actionLink = validateActivationLink(input.actionLink);
  const safeEmpresa = escapeHtml(empresaNombre);
  const safeLink = escapeHtml(actionLink);

  try {
    await emailService.send({
      to,
      subject: "Activa tu cuenta Ventora",
      text: [
        `Tu cuenta para ${empresaNombre} esta casi lista.`,
        "Confirma tu correo y define tu acceso usando este enlace de un solo uso:",
        actionLink,
        "Si no solicitaste esta cuenta, ignora este mensaje.",
      ].join("\n\n"),
      html: [
        `<p>Tu cuenta para <strong>${safeEmpresa}</strong> esta casi lista.</p>`,
        "<p>Confirma tu correo y define tu acceso usando este enlace de un solo uso:</p>",
        `<p><a href="${safeLink}">Activar cuenta Ventora</a></p>`,
        "<p>Si no solicitaste esta cuenta, ignora este mensaje.</p>",
      ].join(""),
    });

    return { sent: true as const };
  } catch (error) {
    console.error("[auth-activation] No pudimos enviar la activacion.", {
      to,
      error,
    });
    return { sent: false as const, reason: "send_failed" as const };
  }
}
