import { buildGlassValue } from "@/features/cotizaciones/new-quote/workflow-ui";

export const LINE_TEMPLATE_HABITUAL_GLASS_NONE = "";

export const LINE_TEMPLATE_HABITUAL_GLASS_OPTIONS = [
  {
    value: LINE_TEMPLATE_HABITUAL_GLASS_NONE,
    label: "Vidrio habitual no definido",
  },
  {
    value: buildGlassValue("Incoloro monolítico", "4mm"),
    label: "Monolítico 4 mm",
  },
  {
    value: buildGlassValue("Incoloro monolítico", "5mm"),
    label: "Monolítico 5 mm",
  },
  {
    value: buildGlassValue("Incoloro monolítico", "6mm"),
    label: "Monolítico 6 mm",
  },
  {
    value: buildGlassValue("Laminado", "3+3"),
    label: "Laminado",
  },
  {
    value: buildGlassValue("DVH", "4+12+4"),
    label: "DVH",
  },
  {
    value: buildGlassValue("Templado", "6mm"),
    label: "Templado",
  },
  {
    value: buildGlassValue("Espejo", "5mm"),
    label: "Espejo",
  },
] as const;

export function formatLineTemplateHabitualGlassLabel(
  value: string | null | undefined
): string | null {
  const normalized = value?.trim();
  if (!normalized) return null;

  const match = LINE_TEMPLATE_HABITUAL_GLASS_OPTIONS.find(
    (option) => option.value === normalized
  );
  return match?.label ?? normalized;
}
