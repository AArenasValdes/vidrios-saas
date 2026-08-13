import "server-only";

import { emailService } from "@/features/notificaciones/services/email-notifications.service";
import { buildWelcomeEmailContent } from "@/features/auth/services/auth-welcome-email.template";

export type WelcomeEmailInput = {
  to: string;
  nombre: string;
  empresaNombre: string;
  trialEndsAt?: string | null;
};

export async function sendWelcomeEmail(input: WelcomeEmailInput) {
  const to = input.to.trim().toLowerCase();
  if (!to || !to.includes("@")) {
    return { sent: false as const, reason: "invalid_email" as const };
  }

  const content = buildWelcomeEmailContent({
    nombre: input.nombre,
    empresaNombre: input.empresaNombre,
    trialEndsAt: input.trialEndsAt,
  });

  try {
    await emailService.send({
      to,
      subject: content.subject,
      html: content.html,
      text: content.text,
    });
    return { sent: true as const };
  } catch (error) {
    console.error("[welcome-email] No pudimos enviar el correo de bienvenida.", error);
    return { sent: false as const, reason: "send_failed" as const };
  }
}
