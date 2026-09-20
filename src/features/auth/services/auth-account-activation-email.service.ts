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

function collectAllowedActivationHosts() {
  const hosts = new Set<string>();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (supabaseUrl) {
    hosts.add(new URL(supabaseUrl).hostname);
  }

  if (appUrl) {
    hosts.add(new URL(appUrl).hostname);
  }

  return hosts;
}

function validateActivationLink(value: string) {
  const activationUrl = new URL(value);
  const isLocal =
    activationUrl.hostname === "localhost" ||
    activationUrl.hostname === "127.0.0.1";
  const protocolOk =
    activationUrl.protocol === "https:" ||
    (isLocal && activationUrl.protocol === "http:");
  const allowedHosts = collectAllowedActivationHosts();

  if (
    !protocolOk ||
    (!isLocal && !allowedHosts.has(activationUrl.hostname))
  ) {
    throw new Error("El enlace de activacion no pertenece al proyecto Ventora.");
  }

  return activationUrl.toString();
}

export function buildEmailActivationCallbackUrl(input: {
  origin: string;
  hashedToken: string;
  otpType: "signup" | "invite";
  nextPath: "/activacion" | "/auth/definir-contrasena";
}) {
  const redirect = new URL("/auth/callback", input.origin);
  redirect.searchParams.set("token_hash", input.hashedToken);
  redirect.searchParams.set("type", input.otpType);
  redirect.searchParams.set("intent", "signup");
  redirect.searchParams.set("provider", "email");
  redirect.searchParams.set("next", input.nextPath);
  return redirect.toString();
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
