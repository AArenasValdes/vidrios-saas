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
      // Lazy load Resend only if configured
        try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { default: Resend } = require("resend");
        const resend = new Resend(apiKey);
        return new ResendEmailService(resend);
      } catch {
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
    try {
      await (this.resend as { emails: { send: (args: SendEmailInput & { from: string }) => Promise<unknown> } }).emails.send({
        from: process.env.EMAIL_FROM ?? "Ventora <notificaciones@ventorap.cl>",
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      });
    } catch (error) {
    console.error("Email send failed:", error);
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
