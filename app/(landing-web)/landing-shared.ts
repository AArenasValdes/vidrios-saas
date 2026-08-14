import { BILLING_PLANS } from "@/features/billing/types/plans";

export const WHATSAPP_LANDING_HREF =
  "https://wa.me/56977338906?text=Hola%20Ventora%2C%20quiero%20mi%20demo.";

export const REGISTRO_HREF = "/registro";
export const LOGIN_HREF = "/login";

export const navLinks = [
  { href: "#problema", label: "Problema" },
  { href: "#solucion", label: "Cómo" },
  { href: "#precios", label: "Precios" },
  { href: "#preguntas", label: "Preguntas" },
] as const;

export const heroTrustItems = [
  "15 días gratis",
  "Cualquier dispositivo",
  "Pensado para Latinoamérica",
  "PDF profesional",
] as const;

export const LATAM_COUNTRIES_LABEL =
  "Chile, Argentina, Colombia, México, Perú y Uruguay";

export const PRICING_IMPLEMENTATION_HREF = `https://wa.me/56977338906?text=${encodeURIComponent(
  "Hola Ventora, quiero solicitar implementación acompañada para mi empresa."
)}`;

export const founderPlanBenefits = [
  "Todo lo de Ventora Cotización",
  "Seguimiento comercial y aprobación del cliente",
  "Página pública para solicitudes (si la activas)",
  "Bandeja, links por canal y QR",
  "Configuración inicial incluida",
  "Soporte de arranque por WhatsApp",
] as const;

export const monthlyPlanBenefits = [
  "Mismas funciones de Ventora Comercial",
  "Pago mensual flexible",
  "15 días gratis",
  "Puedes pasar al anual cuando quieras",
] as const;

export const quoteOnlyPlanBenefits = [
  "Cotizador en celular, tablet y computador",
  "Misma cuenta en varios dispositivos",
  "PDF profesional y envío por WhatsApp",
  "Clientes y cotizaciones ordenadas",
  "Líneas propias, recetas, cubicación y pauta de corte opcional",
  "Sin página pública: solo cotizar y enviar",
] as const;

export const accompaniedPlanBenefits = [
  "Servicio complementario a tu plan",
  "Configuración asistida completa",
  "Capacitación inicial",
  "Soporte prioritario de arranque",
  "Revisión de página pública (si la usas)",
] as const;

export function formatClp(value: number) {
  return `CLP $${value.toLocaleString("es-CL")}`;
}

export const monthlyPrice = BILLING_PLANS.founder_monthly.amountClp;
export const yearlyPrice = BILLING_PLANS.founder_full_annual.amountClp;
export const quoteOnlyPrice = BILLING_PLANS.quote_only_annual.amountClp;
export const yearlyEquivalentMonthlyPrice = Math.round(yearlyPrice / 12);
export const annualSavingsVsMonthly = monthlyPrice * 12 - yearlyPrice;

export type PricingPlanTone = "secondary" | "featured" | "highlight" | "anchor";
export type PricingPlanCtaKind = "internal" | "whatsapp";

export type PricingPlan = {
  name: string;
  price: string;
  period: string;
  description: string;
  ctaLabel: string;
  href: string;
  ctaKind: PricingPlanCtaKind;
  tone: PricingPlanTone;
  trackingLocation: string;
  badge?: string;
  helper?: string;
  savings?: string;
  benefits?: readonly string[];
};

export const pricingPlans: readonly PricingPlan[] = [
  {
    name: "Ventora Comercial — anual",
    price: formatClp(yearlyPrice),
    period: "/ año",
    description: `Equivale a ${formatClp(yearlyEquivalentMonthlyPrice)} al mes`,
    ctaLabel: "Empezar 15 días gratis",
    href: REGISTRO_HREF,
    ctaKind: "internal",
    tone: "featured",
    trackingLocation: "precios-fundador",
    badge: "Recomendado",
    helper: "Cotización, fabricación configurable y captación opcional en un solo plan.",
    savings: `Ahorras ${formatClp(annualSavingsVsMonthly)} al año frente al pago mensual`,
    benefits: founderPlanBenefits,
  },
  {
    name: "Ventora Cotización — anual",
    price: formatClp(quoteOnlyPrice),
    period: "/ año",
    description: "Entrada simple para cotizar y enviar presupuestos profesionales.",
    ctaLabel: "Probar cotizador gratis",
    href: REGISTRO_HREF,
    ctaKind: "internal",
    tone: "highlight",
    trackingLocation: "precios-solo-cotizacion",
    helper: "Incluye cubicación y pauta de corte opcional; excluye la página pública.",
    benefits: quoteOnlyPlanBenefits,
  },
  {
    name: "Ventora Comercial — mensual",
    price: formatClp(monthlyPrice),
    period: "/ mes",
    description: "Las mismas funciones de Ventora Comercial, con pago mes a mes.",
    ctaLabel: "Probar 15 días gratis",
    href: REGISTRO_HREF,
    ctaKind: "internal",
    tone: "secondary",
    trackingLocation: "precios-mensual",
    benefits: monthlyPlanBenefits,
  },
  {
    name: "Configuración asistida",
    price: "Desde CLP $250.000",
    period: "servicio complementario",
    description:
      "Para empresas que necesitan configuración asistida, capacitación y soporte de arranque.",
    ctaLabel: "Solicitar implementación",
    href: PRICING_IMPLEMENTATION_HREF,
    ctaKind: "whatsapp",
    tone: "anchor",
    trackingLocation: "precios-implementacion",
    benefits: accompaniedPlanBenefits,
  },
];

export const faqs = [
  {
    question: "¿Ventora es un cotizador técnico?",
    answer:
      "Ventora parte como cotizador comercial y puede sumar fabricación configurable. Con recetas validadas por tu taller genera cubicación, despiece y una pauta de corte revisable; no es CAD, ERP ni optimizador industrial.",
  },
  {
    question: "¿Sirve en cualquier dispositivo?",
    answer:
      "Sí. Funciona en celular, tablet y computador. Entras desde varios dispositivos con la misma cuenta: cotizas en terreno y sigues en el taller.",
  },
  {
    question: "¿Está disponible en Latinoamérica?",
    answer: `Está pensado para talleres de ${LATAM_COUNTRIES_LABEL}. Puedes elegir tu país y trabajar con su moneda, prefijo y configuración regional. Los pagos directos y los precios publicados están disponibles inicialmente en Chile.`,
  },
  {
    question: "¿Puedo cubicar y hacer despiece?",
    answer:
      "Sí. Puedes agregar líneas, perfiles, reglas y largos comerciales para obtener cubicación, despiece y pautas de corte revisables. Si una línea aún no tiene receta, puedes cotizar su precio de todas formas.",
  },
  {
    question: "¿Cuánto dura la prueba?",
    answer:
      "15 días gratis, con acceso completo, sin tarjeta. Cancelas cuando quieras.",
  },
  {
    question: "¿Qué pasa si dejo mis datos en el formulario?",
    answer:
      "Guardamos tu consulta y te contactamos por WhatsApp. No te saca de la página. Si quieres partir ahora, crea tu cuenta y arranca los 15 días.",
  },
  {
    question: "¿Ventora reemplaza mi WhatsApp?",
    answer:
      "No. Ventora te ayuda a cotizar, generar PDF y enviar presupuestos por WhatsApp. También puedes recibir solicitudes con tu link público si lo activas.",
  },
  {
    question: "¿Necesito la página pública para usar Ventora?",
    answer:
      "No. Puedes empezar solo con el cotizador. La página pública es un complemento para captar solicitudes cuando no puedes responder.",
  },
] as const;
