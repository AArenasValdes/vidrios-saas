import type { GrowthOnboardingDevice } from "@/features/growth/types/growth-onboarding";

export type AutomaticOnboardingDevice = Exclude<GrowthOnboardingDevice, "ambos">;

export type OnboardingVideoBlueprint = {
  title: string;
  summary: string;
  durationSeconds: number;
  objective: string;
  recordingSteps: readonly string[];
};

export const ONBOARDING_VIDEO_BLUEPRINTS: Record<
  AutomaticOnboardingDevice,
  OnboardingVideoBlueprint
> = {
  movil: {
    title: "Cotiza desde el celular y envía tu PDF",
    summary: "Crea una cotización rápida en terreno, revísala y compártela por WhatsApp.",
    durationSeconds: 90,
    objective: "Llevar a la primera cotización y al primer PDF sin esperar llegar al computador.",
    recordingSteps: [
      "Nueva cotización y datos del cliente.",
      "Precio o trabajo simple para cotizar rápido.",
      "Resumen, PDF y envío por WhatsApp.",
    ],
  },
  escritorio: {
    title: "Configura líneas y cotiza por ítems",
    summary: "Deja tus líneas y precios listos en computador; después cotiza desde celular o escritorio.",
    durationSeconds: 120,
    objective: "Mostrar cómo preparar el catálogo comercial y usarlo en una cotización por ítems.",
    recordingSteps: [
      "Configura una línea común y su precio.",
      "Crea una cotización por ítems con esa línea.",
      "Aclara que también puede continuar desde el celular.",
    ],
  },
};
