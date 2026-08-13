import "server-only";

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

class ConsoleEmailService implements EmailService {
  isConfigured() {
    return true;
  }

  getProvider() {
    return "console";
  }

  async send(input: SendEmailInput) {
    console.log("[EMAIL]", input.subject, "->", input.to);
  }
}

class EmailClientManager {
  private provider: EmailService | null = null;

  getInstance(): EmailService {
    if (this.provider) {
      return this.provider;
    }

    const emailProvider = process.env.EMAIL_PROVIDER;
    const apiKey = process.env.EMAIL_API_KEY;

    if (emailProvider === "resend" && apiKey) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { default: Resend } = require("resend");
        const resend = new Resend(apiKey);
        this.provider = new ResendEmailService(resend);
        return this.provider;
      } catch (error) {
        console.error("[email] No pudimos iniciar Resend. Usamos consola.", error);
        this.provider = new ConsoleEmailService();
        return this.provider;
      }
    }

    this.provider = new ConsoleEmailService();
    return this.provider;
  }
}

class ResendEmailService implements EmailService {
  private resend: unknown;

  constructor(resendClient: unknown) {
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

    const result = (await (
      this.resend as {
        emails: {
          send: (args: {
            from: string;
            to: string;
            subject: string;
            html: string;
            text: string;
            replyTo?: string;
          }) => Promise<{ data?: unknown; error?: { message?: string } | null }>;
        };
      }
    ).emails.send({
      from: process.env.EMAIL_FROM ?? "Ventora <hola@ventorap.cl>",
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo,
    })) as { data?: unknown; error?: { message?: string } | null };

    if (result?.error) {
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
