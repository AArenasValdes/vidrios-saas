import type {
  GrowthProspect,
  GrowthProspectStatus,
} from "@/features/growth/types/growth-dashboard";
import { resolvePublicAppUrl } from "@/utils/public-app-url";

/** Fallback temporal hasta pantalla de Configuración. Fuente única de plantillas. */
export type ProspectWhatsappTemplateCategory =
  | "nuevo_importado"
  | "contactado_sin_respuesta"
  | "interesado"
  | "demo_agendada"
  | "trial_activo"
  | "trial_vencido"
  | "cliente_activo";

export type ProspectWhatsappTemplateVariable =
  | "empresa"
  | "contacto"
  | "ciudad"
  | "rubro"
  | "origen"
  | "link_trial"
  | "link_demo";

export type ProspectWhatsappTemplate = {
  id: string;
  name: string;
  category: ProspectWhatsappTemplateCategory;
  recommendedStatuses: GrowthProspectStatus[];
  text: string;
  allowedVariables: ProspectWhatsappTemplateVariable[];
  active: boolean;
};

export type ProspectWhatsappTemplateContext = {
  empresa: string;
  contacto: string;
  ciudad: string;
  rubro: string;
  origen: string;
  link_trial: string;
  link_demo: string;
};

const DEFAULT_DEMO_LINK = "https://www.ventorap.cl/demo";

function buildDefaultLinks() {
  const appUrl = resolvePublicAppUrl();
  return {
    link_trial: `${appUrl}/login`,
    link_demo: DEFAULT_DEMO_LINK,
  };
}

function isImportedOrigin(origen: string) {
  const normalized = origen.trim().toLowerCase();
  return (
    normalized.includes("import") ||
    normalized.includes("excel") ||
    normalized.includes("csv") ||
    normalized.includes("planilla")
  );
}

export const PROSPECT_WHATSAPP_TEMPLATES: ProspectWhatsappTemplate[] = [
  {
    id: "primer_contacto_importado",
    name: "Primer contacto — Prospecto importado",
    category: "nuevo_importado",
    recommendedStatuses: ["nuevo", "investigado", "listo_para_contactar"],
    allowedVariables: ["contacto", "empresa", "ciudad", "rubro", "origen"],
    active: true,
    text: `Hola {{contacto}}, ¿cómo estás?

Te escribo desde Ventora. Vi a {{empresa}} y creo que pueden ahorrar tiempo cotizando vidrios y aluminio desde el celular con PDF profesional.

¿Te parece si te cuento en 2 minutos cómo lo usan otras vidrierías?`,
  },
  {
    id: "primer_contacto_manual",
    name: "Primer contacto — Empresa encontrada manualmente",
    category: "nuevo_importado",
    recommendedStatuses: ["nuevo", "investigado", "listo_para_contactar"],
    allowedVariables: ["contacto", "empresa", "ciudad", "rubro"],
    active: true,
    text: `Hola {{contacto}}, te saluda el equipo de Ventora.

Estuve revisando {{empresa}} y me pareció que podrían simplificar sus cotizaciones con una herramienta pensada para vidrierías y aluminio.

¿Te interesa que te muestre cómo funciona en una demo corta?`,
  },
  {
    id: "seguimiento_breve",
    name: "Seguimiento breve",
    category: "contactado_sin_respuesta",
    recommendedStatuses: ["contactado", "sin_respuesta"],
    allowedVariables: ["contacto", "empresa"],
    active: true,
    text: `Hola {{contacto}}, te escribo de nuevo desde Ventora.

¿Pudiste ver mi mensaje sobre {{empresa}}? Si te sirve, te muestro en 5 minutos cómo cotizar desde el celular y enviar PDF profesional.`,
  },
  {
    id: "seguimiento_demo",
    name: "Seguimiento con propuesta de demo",
    category: "contactado_sin_respuesta",
    recommendedStatuses: ["contactado", "sin_respuesta"],
    allowedVariables: ["contacto", "empresa", "link_demo"],
    active: true,
    text: `Hola {{contacto}}, retomo el contacto por {{empresa}}.

Si te acomoda, agendamos una demo breve para ver cotización móvil y PDF en acción: {{link_demo}}

¿Qué día te queda mejor?`,
  },
  {
    id: "invitacion_demo",
    name: "Invitación a demo",
    category: "interesado",
    recommendedStatuses: ["respondio", "calificado", "demo_enviada"],
    allowedVariables: ["contacto", "empresa", "link_demo"],
    active: true,
    text: `Hola {{contacto}}, qué bueno tu interés en Ventora para {{empresa}}.

Te propongo una demo de 15 minutos para ver cotización desde el celular y el PDF que recibe tu cliente: {{link_demo}}

¿Te reservo un horario esta semana?`,
  },
  {
    id: "invitacion_trial",
    name: "Invitación a prueba gratuita",
    category: "interesado",
    recommendedStatuses: ["respondio", "calificado"],
    allowedVariables: ["contacto", "empresa", "link_trial"],
    active: true,
    text: `Hola {{contacto}}, para {{empresa}} podemos activar una prueba gratuita de Ventora.

Entras acá: {{link_trial}}
Y te acompaño a crear tu primera cotización con PDF profesional.

¿Te ayudo a configurarlo hoy?`,
  },
  {
    id: "explicar_cotizacion_movil",
    name: "Explicar cotización móvil y PDF profesional",
    category: "interesado",
    recommendedStatuses: ["respondio", "calificado", "demo_enviada"],
    allowedVariables: ["contacto", "empresa"],
    active: true,
    text: `Hola {{contacto}}, te cuento en concreto qué resuelve Ventora para {{empresa}}:

• Cotizás desde el celular en obra o en ruta
• Generás un PDF profesional listo para enviar
• Centralizás clientes y seguimiento comercial

¿Querés que te lo muestre en una demo rápida?`,
  },
  {
    id: "confirmacion_demo",
    name: "Confirmación de demo",
    category: "demo_agendada",
    recommendedStatuses: ["demo_agendada"],
    allowedVariables: ["contacto", "empresa", "link_demo"],
    active: true,
    text: `Hola {{contacto}}, confirmo la demo de Ventora para {{empresa}}.

Si necesitás reagendar, avísame. Link por si lo quieres tener a mano: {{link_demo}}

¡Nos vemos pronto!`,
  },
  {
    id: "recordatorio_demo",
    name: "Recordatorio de demo",
    category: "demo_agendada",
    recommendedStatuses: ["demo_agendada"],
    allowedVariables: ["contacto", "empresa"],
    active: true,
    text: `Hola {{contacto}}, te recuerdo la demo de Ventora para {{empresa}}.

Prepararé ejemplos de cotización móvil y PDF. ¿Algún caso real que quieras ver?`,
  },
  {
    id: "bienvenida_trial",
    name: "Bienvenida y ayuda inicial",
    category: "trial_activo",
    recommendedStatuses: ["piloto_activo"],
    allowedVariables: ["contacto", "empresa", "link_trial"],
    active: true,
    text: `Hola {{contacto}}, bienvenido a Ventora para {{empresa}}.

Acceso: {{link_trial}}
Estoy disponible para ayudarte con la configuración inicial y tu primera cotización.

¿Por dónde prefieres empezar?`,
  },
  {
    id: "ayuda_primera_cotizacion",
    name: "Ayuda para primera cotización",
    category: "trial_activo",
    recommendedStatuses: ["piloto_activo"],
    allowedVariables: ["contacto", "empresa", "link_trial"],
    active: true,
    text: `Hola {{contacto}}, ¿cómo va el trial en {{empresa}}?

Si quieres, te guío paso a paso para crear tu primera cotización y PDF: {{link_trial}}

¿Te funciona una llamada corta hoy?`,
  },
  {
    id: "recordatorio_trial",
    name: "Recordatorio de trial",
    category: "trial_activo",
    recommendedStatuses: ["piloto_activo"],
    allowedVariables: ["contacto", "empresa", "link_trial"],
    active: true,
    text: `Hola {{contacto}}, te escribo para ver cómo va la prueba en {{empresa}}.

¿Pudiste crear alguna cotización? Entra acá si lo necesitas: {{link_trial}}

¿En qué te ayudo?`,
  },
  {
    id: "recuperacion_trial",
    name: "Recuperación de trial",
    category: "trial_vencido",
    recommendedStatuses: ["activado", "esperando_pago"],
    allowedVariables: ["contacto", "empresa", "link_trial"],
    active: true,
    text: `Hola {{contacto}}, vi que el trial de {{empresa}} quedó pausado.

¿Te ayudo a retomarlo o resolver alguna duda antes de decidir? Acceso: {{link_trial}}`,
  },
  {
    id: "extension_trial",
    name: "Extensión de prueba",
    category: "trial_vencido",
    recommendedStatuses: ["activado", "esperando_pago"],
    allowedVariables: ["contacto", "empresa", "link_trial"],
    active: true,
    text: `Hola {{contacto}}, para {{empresa}} puedo coordinar una extensión breve del trial si necesitas más tiempo para probar.

¿Te sirve que lo reactivemos? {{link_trial}}`,
  },
  {
    id: "ayuda_configuracion",
    name: "Oferta de ayuda de configuración",
    category: "trial_vencido",
    recommendedStatuses: ["activado", "esperando_pago"],
    allowedVariables: ["contacto", "empresa"],
    active: true,
    text: `Hola {{contacto}}, ofrezco una sesión corta para dejar Ventora listo en {{empresa}}: logo, precios base y primera cotización.

¿Te acomoda esta semana?`,
  },
  {
    id: "seguimiento_uso",
    name: "Seguimiento de uso",
    category: "cliente_activo",
    recommendedStatuses: ["pagado"],
    allowedVariables: ["contacto", "empresa"],
    active: true,
    text: `Hola {{contacto}}, ¿cómo va el uso de Ventora en {{empresa}}?

Quiero asegurarme de que estén cotizando cómodo desde el celular y enviando PDF sin fricción.`,
  },
  {
    id: "solicitud_feedback",
    name: "Solicitud de feedback",
    category: "cliente_activo",
    recommendedStatuses: ["pagado"],
    allowedVariables: ["contacto", "empresa"],
    active: true,
    text: `Hola {{contacto}}, me gustaría tu feedback sobre Ventora en {{empresa}}.

¿Qué te está funcionando bien y qué mejorarías para el día a día?`,
  },
  {
    id: "renovacion_proxima",
    name: "Renovación próxima",
    category: "cliente_activo",
    recommendedStatuses: ["pagado"],
    allowedVariables: ["contacto", "empresa"],
    active: true,
    text: `Hola {{contacto}}, te escribo por la renovación de {{empresa}} en Ventora.

¿Quieres que revisemos juntos el plan antes de la fecha de cierre?`,
  },
];

export function resolveProspectTemplateCategory(
  prospect: GrowthProspect
): ProspectWhatsappTemplateCategory {
  const { estado } = prospect;

  if (["nuevo", "investigado", "listo_para_contactar"].includes(estado)) {
    return "nuevo_importado";
  }

  if (["contactado", "sin_respuesta"].includes(estado)) {
    return "contactado_sin_respuesta";
  }

  if (["respondio", "calificado", "demo_enviada"].includes(estado)) {
    return "interesado";
  }

  if (estado === "demo_agendada") {
    return "demo_agendada";
  }

  if (estado === "piloto_activo") {
    return "trial_activo";
  }

  if (["activado", "esperando_pago"].includes(estado)) {
    return "trial_vencido";
  }

  if (estado === "pagado") {
    return "cliente_activo";
  }

  return "contactado_sin_respuesta";
}

export function buildProspectTemplateContext(
  prospect: GrowthProspect
): ProspectWhatsappTemplateContext {
  const links = buildDefaultLinks();
  const contacto = prospect.nombre.trim() || "equipo de " + prospect.empresa.trim();

  return {
    empresa: prospect.empresa.trim(),
    contacto,
    ciudad: prospect.ciudad.trim(),
    rubro: (prospect.rubro ?? "").trim(),
    origen: prospect.origen.trim(),
    link_trial: links.link_trial,
    link_demo: links.link_demo,
  };
}

export function resolveTemplateVariables(
  text: string,
  context: ProspectWhatsappTemplateContext
): string {
  const variables: Record<ProspectWhatsappTemplateVariable, string> = {
    empresa: context.empresa,
    contacto: context.contacto,
    ciudad: context.ciudad,
    rubro: context.rubro,
    origen: context.origen,
    link_trial: context.link_trial,
    link_demo: context.link_demo,
  };

  const lines = text.split("\n");
  const resolvedLines = lines
    .map((line) => {
      let resolved = line;

      for (const [key, value] of Object.entries(variables) as Array<
        [ProspectWhatsappTemplateVariable, string]
      >) {
        const token = `{{${key}}}`;
        if (!resolved.includes(token)) {
          continue;
        }

        if (value) {
          resolved = resolved.replaceAll(token, value);
        } else {
          return null;
        }
      }

      if (/\{\{[a-z_]+\}\}/.test(resolved)) {
        return null;
      }

      return resolved;
    })
    .filter((line): line is string => line !== null && line.trim().length > 0);

  return resolvedLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function getTemplatesForProspect(prospect: GrowthProspect) {
  const category = resolveProspectTemplateCategory(prospect);
  return PROSPECT_WHATSAPP_TEMPLATES.filter(
    (template) => template.active && template.category === category
  );
}

export function pickRecommendedTemplate(
  prospect: GrowthProspect,
  templates: ProspectWhatsappTemplate[]
): ProspectWhatsappTemplate | null {
  if (templates.length === 0) {
    return null;
  }

  const category = resolveProspectTemplateCategory(prospect);

  if (category === "nuevo_importado") {
    const preferredId = isImportedOrigin(prospect.origen)
      ? "primer_contacto_importado"
      : "primer_contacto_manual";
    const preferred = templates.find((template) => template.id === preferredId);
    if (preferred) {
      return preferred;
    }
  }

  const byStatus = templates.find((template) =>
    template.recommendedStatuses.includes(prospect.estado)
  );
  if (byStatus) {
    return byStatus;
  }

  return templates[0] ?? null;
}

export function resolveProspectWhatsappMessage(
  prospect: GrowthProspect,
  template: ProspectWhatsappTemplate
) {
  const context = buildProspectTemplateContext(prospect);
  return resolveTemplateVariables(template.text, context);
}

export function shouldUseRegisterContactPipeline(prospect: GrowthProspect) {
  return ["nuevo", "investigado", "listo_para_contactar", "sin_respuesta"].includes(
    prospect.estado
  );
}

export function addDaysYmd(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function formatFollowupDateLabel(ymd: string) {
  try {
    return new Date(`${ymd}T12:00:00`).toLocaleDateString("es-CL", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return ymd;
  }
}
