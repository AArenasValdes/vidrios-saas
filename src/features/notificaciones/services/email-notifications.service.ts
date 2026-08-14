import "server-only";

import { Resend } from "resend";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export interface EmailService {
  send(input: SendEmailInput): Promise<void>;
  getProvider(): string | null;
  isConfigured(): boolean;
}

export function isTransactionalEmailConfigured() {
  return (
    process.env.EMAIL_PROVIDER === "resend" &&
    Boolean(process.env.EMAIL_API_KEY?.trim())
  );
}

class ConsoleEmailService implements EmailService {
  isConfigured() {
    return false;
  }

  getProvider() {
    return "console";
  }

  async send(input: SendEmailInput) {
    if (process.env.VERCEL === "1") {
      console.warn(
        "[email] Correo transaccional no configurado en produccion. Solo se registra en logs:",
        input.subject,
        "->",
        input.to,
      );
    } else {
      console.log("[EMAIL]", input.subject, "->", input.to);
    }
  }
}

class EmailClientManager {
  private provider: EmailService | null = null;

  getInstance(): EmailService {
    if (this.provider) {
      return this.provider;
    }

    if (isTransactionalEmailConfigured()) {
      try {
        const resend = new Resend(process.env.EMAIL_API_KEY!.trim());
        this.provider = new ResendEmailService(resend);
        return this.provider;
      } catch (error) {
        console.error("[email] No pudimos iniciar Resend. Usamos consola.", error);
      }
    }

    this.provider = new ConsoleEmailService();
    return this.provider;
  }
}

class ResendEmailService implements EmailService {
  private resend: Resend;

  constructor(resendClient: Resend) {
    this.resend = resendClient;
  }

  isConfigured() {
    return true;
  }

  getProvider() {
    return "resend";
  }

  async send(input: SendEmailInput) {
    const replyTo =
      process.env.EMAIL_REPLY_TO?.trim() || "ventora.cl@gmail.com";

    const result = await this.resend.emails.send({
      from: process.env.EMAIL_FROM ?? "Ventora <hola@ventorap.cl>",
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo,
    });

    if (result.error) {
      throw new Error(result.error.message ?? "No pudimos enviar el correo.");
    }
  }
}

const emailManager = new EmailClientManager();

export const emailService: EmailService = {
  send(input: SendEmailInput) {
    return emailManager.getInstance().send(input);
  },

  getProvider() {
    return emailManager.getInstance().getProvider();
  },

  isConfigured() {
    return emailManager.getInstance().isConfigured();
  },
};
