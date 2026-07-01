import { getProspectStatusLabel } from "@/features/growth/services/prospectos-workspace.service";
import type { GrowthDbActivityType } from "@/features/growth/types/growth-supabase";
import { formatFollowupDateLabel } from "@/features/growth/services/prospect-whatsapp-templates";

export type ProspectActivityView = {
  id: string;
  title: string;
  subtitle: string | null;
  at: string;
};

type ActivityLike = {
  id: string;
  tipo: string;
  canal?: string | null;
  contenido?: string | null;
  metadata_json?: Record<string, unknown> | null;
  creado_en: string;
};

function readString(metadata: Record<string, unknown> | null | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function formatProspectActivity(activity: ActivityLike): ProspectActivityView {
  const metadata = activity.metadata_json ?? {};
  const templateName = readString(metadata, "templateName");
  const followupDate = readString(metadata, "followupDate");
  const resultLabel = readString(metadata, "resultLabel");
  const previousStatus = readString(metadata, "previousStatus");
  const nextStatus = readString(metadata, "nextStatus");

  let title = activity.tipo;
  let subtitle = activity.contenido?.trim() || null;

  switch (activity.tipo as GrowthDbActivityType) {
    case "mensaje_enviado": {
      const raw = activity.contenido?.trim() ?? "";
      const bracketMatch = raw.match(/^\[(.+)\]\n([\s\S]*)$/);
      if (bracketMatch) {
        title = `WhatsApp enviado · ${bracketMatch[1]}`;
        subtitle = bracketMatch[2].trim() || null;
        break;
      }
      title = templateName
        ? `WhatsApp enviado · ${templateName}`
        : "WhatsApp enviado";
      break;
    }
    case "nota":
      if (readString(metadata, "kind") === "plantilla_preparada") {
        title = templateName
          ? `Plantilla preparada · ${templateName}`
          : "Plantilla preparada";
      } else if (readString(metadata, "kind") === "seguimiento") {
        title = "Seguimiento registrado";
        if (resultLabel) {
          subtitle = resultLabel;
        }
      } else {
        title = "Nota";
      }
      break;
    case "followup":
      title = followupDate
        ? `Seguimiento agendado para ${formatFollowupDateLabel(followupDate)}`
        : "Seguimiento agendado";
      break;
    case "demo":
      title = "Demo agendada";
      break;
    case "trial":
      title = "Trial creado";
      break;
    case "cambio_estado":
      title = "Cambio de estado";
      if (previousStatus && nextStatus) {
        subtitle = `${getProspectStatusLabel(previousStatus as never)} → ${getProspectStatusLabel(nextStatus as never)}`;
      } else if (activity.contenido) {
        subtitle = activity.contenido;
      }
      break;
    case "perdida":
      title = "Prospecto marcado perdido";
      break;
    case "pago":
      title = "Prospecto marcado ganado";
      break;
    default:
      title = activity.tipo.replace(/_/g, " ");
      break;
  }

  return {
    id: activity.id,
    title,
    subtitle,
    at: activity.creado_en,
  };
}
