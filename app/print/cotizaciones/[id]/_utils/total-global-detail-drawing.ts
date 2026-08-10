import { resolveCotizacionItemDrawingSvg } from "@/features/cotizaciones/visual-composer/services/resolve-item-drawing-svg";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import {
  decodeCotizacionItemPresentationMeta,
} from "@/utils/cotizacion-item-presentation";

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function escapeSvgText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildReferenceSvg(title: string, body: string) {
  return `
    <svg role="img" aria-label="${escapeSvgText(title)}" viewBox="0 0 110 72" xmlns="http://www.w3.org/2000/svg">
      <title>${escapeSvgText(title)}</title>
      <rect x="1.5" y="1.5" width="107" height="69" rx="7" fill="#fff" stroke="#dbe3ee" stroke-width="2"/>
      <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3">
        ${body}
      </g>
    </svg>
  `;
}

function resolveReferenceSvg(name: string, description: string | null | undefined) {
  const text = normalizeSearchText(`${name} ${description ?? ""}`);

  if (text.includes("ventana corredera") || text.includes("corredera")) {
    return buildReferenceSvg(
      "Ventana corredera referencial",
      '<rect x="20" y="16" width="70" height="40" rx="2"/><path d="M55 16v40M22 60h66M36 36h16M74 36H58"/><path d="M39 30l-7 6 7 6M71 30l7 6-7 6"/>'
    );
  }

  if (text.includes("ventana abatible") || text.includes("abatible")) {
    return buildReferenceSvg(
      "Ventana abatible referencial",
      '<rect x="27" y="14" width="56" height="44" rx="2"/><path d="M27 58l42-44M69 14v44M43 34h5"/>'
    );
  }

  if (text.includes("proyectante")) {
    return buildReferenceSvg(
      "Ventana proyectante referencial",
      '<rect x="27" y="14" width="56" height="44" rx="2"/><path d="M27 58h56M34 23h42v26H34zM45 35h20"/>'
    );
  }

  if (text.includes("oscilobatiente")) {
    return buildReferenceSvg(
      "Ventana oscilobatiente referencial",
      '<rect x="27" y="14" width="56" height="44" rx="2"/><path d="M27 58l42-44M69 14v44M39 28l-6 6 6 6"/>'
    );
  }

  if (text.includes("pano fijo") || text.includes("fijo")) {
    return buildReferenceSvg(
      "Pano fijo referencial",
      '<rect x="25" y="13" width="60" height="46" rx="2"/><path d="M32 20h46v32H32zM25 62h60"/>'
    );
  }

  if (text.includes("puerta")) {
    return buildReferenceSvg(
      "Puerta referencial",
      '<rect x="37" y="10" width="38" height="52" rx="2"/><path d="M45 18h22v36H45z"/><circle cx="65" cy="37" r="1.8" fill="currentColor" stroke="none"/>'
    );
  }

  if (text.includes("shower") || text.includes("ducha")) {
    return buildReferenceSvg(
      "Shower referencial",
      '<path d="M28 18h50v40H28zM53 18v40M34 58h38"/><path d="M77 22c6 6 6 13 0 19M84 18c8 10 8 21 0 31"/>'
    );
  }

  return buildReferenceSvg(
    "Alcance incluido",
    '<circle cx="55" cy="36" r="21"/><path d="M44 36l8 8 15-17"/>'
  );
}

export function resolveTotalGlobalDetailDrawingSvg(input: {
  item: CotizacionWorkflowItem;
  presentationSvg?: string | null;
}) {
  const presentationSvg = input.presentationSvg?.trim() ?? "";

  if (presentationSvg) {
    return presentationSvg;
  }

  const meta = decodeCotizacionItemPresentationMeta(input.item.observaciones);
  const isFreeItem =
    input.item.tipoItem === "item_libre_con_valor" || meta.displayMode === "item_libre";

  if (!isFreeItem) {
    return resolveCotizacionItemDrawingSvg({
      tipo: input.item.tipo,
      sistema: meta.sistema,
      configuracion: meta.configuracion,
      hojasBase: meta.hojasBase,
      sheetScheme: meta.sheetScheme,
      sheetVariant: meta.sheetVariant,
      customSchemeDescription: meta.customSchemeDescription,
      isCustomScheme: meta.isCustomScheme,
      referencia: meta.referencia,
      ancho: input.item.ancho,
      alto: input.item.alto,
      colorHex: meta.colorHex,
      guidedVisualConfig: meta.guidedVisualConfig,
      palilloEnabled: meta.palilloEnabled,
      palilloType: meta.palilloType,
      mirrorFormat: meta.mirrorFormat,
      mirrorPaneCount: meta.mirrorPaneCount,
      mirrorPaneDirection: meta.mirrorPaneDirection,
      mirrorInteriorLine: meta.mirrorInteriorLine,
      maxW: 220,
      maxH: 140,
      variant: "pdf",
    });
  }

  return resolveReferenceSvg(
    `${input.item.tipo} ${input.item.nombre}`,
    input.item.descripcion
  );
}
