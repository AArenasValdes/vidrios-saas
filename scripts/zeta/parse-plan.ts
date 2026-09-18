import type { Page } from "@playwright/test";

import type { ExtractedPlan, GlassPiece, GlazingType, HardwareItem, ProfileCut } from "./types.ts";
import { inferGlazing } from "./normalize.ts";

const PROFILE_HEADER = /c[oó]digo|perfil|nombre|cantidad|largo|corte/i;

export function parseMm(raw: string): number | null {
  const cleaned = raw.replace(/\s*mm\.?/i, "").trim();
  if (!cleaned) return null;
  if (/^\d{1,3}[.,]\d{3}$/.test(cleaned)) {
    return Number(cleaned.replace(/[.,]/g, ""));
  }
  const asNumber = Number(cleaned.replace(",", "."));
  return Number.isFinite(asNumber) ? asNumber : null;
}

export function parseQuantity(raw: string): number | null {
  const cleaned = raw.replace(/\s/g, "").trim();
  if (!cleaned) return null;
  if (/^\d{1,3}[.,]\d{3}$/.test(cleaned) && !cleaned.includes("00")) {
    return Number(cleaned.replace(/[.,]/g, ""));
  }
  const asNumber = Number(cleaned.replace(",", "."));
  return Number.isFinite(asNumber) ? asNumber : null;
}

function splitMarkdownRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isSeparator(line: string): boolean {
  return /^\s*\|?[\s:-]+\|/.test(line);
}

export function parseProfileTable(text: string): ProfileCut[] {
  const lines = text.split(/\r?\n/);
  const profiles: ProfileCut[] = [];
  let inTable = false;

  for (const line of lines) {
    if (!line.includes("|")) {
      if (inTable && profiles.length > 0) break;
      continue;
    }
    if (isSeparator(line)) continue;
    const cells = splitMarkdownRow(line);
    if (cells.length < 4) continue;
    if (PROFILE_HEADER.test(cells.join(" "))) {
      inTable = true;
      continue;
    }
    if (!inTable && /^\d/.test(cells[0] ?? "") === false && !/^[A-Z0-9]/i.test(cells[0] ?? "")) {
      continue;
    }
    inTable = true;
    const code = cells[0] ?? "";
    const name = cells[1] ?? "";
    const quantity = parseQuantity(cells[2] ?? "");
    const lengthMm = parseMm(cells[3] ?? "");
    const cut1Deg = parseQuantity((cells[4] ?? "").replace("°", ""));
    const cut2Deg = parseQuantity((cells[5] ?? "").replace("°", ""));
    if (!code || !name || quantity == null || lengthMm == null) continue;
    profiles.push({
      code,
      name,
      position: null,
      quantity,
      lengthMm,
      cut1Deg,
      cut2Deg,
    });
  }

  return profiles;
}

export function parseGlassFromText(text: string, fallbackCode?: string | null): GlassPiece[] {
  const pieces: GlassPiece[] = [];
  const glassLine = text
    .split(/\r?\n/)
    .find((line) => /vidrio|cti5|te4104|cristal|termopanel/i.test(line) && /\d/.test(line));
  if (!glassLine) return pieces;

  const codeMatch = glassLine.match(/\b(CTI5|TE4104)\b/i);
  const nameMatch = glassLine.match(/\|\s*([^|]+?)\s*\|/);
  const pairs = [...glassLine.matchAll(/(\d{2,4}(?:[.,]\d{3})?)\s*[x×]\s*(\d{2,4}(?:[.,]\d{3})?)/gi)];
  const anchoAlto = glassLine.match(/ancho\s+(\d{2,4}(?:[.,]\d{3})?)\s*mm.*?alto\s+(\d{1,4}(?:[.,]\d{3})?)\s*mm/i);
  const quantityMatches = [...glassLine.matchAll(/cantidad\s+(\d+(?:[.,]\d+)?)/gi)];

  const code = (codeMatch?.[1]?.toUpperCase() ?? fallbackCode ?? "").replace(/[^A-Z0-9]/g, "");
  const name =
    nameMatch?.[1]?.replace(/^\s*vidrio:\s*/i, "").trim() ??
    (inferGlazing(glassLine) === "dvh"
      ? "Termopanel Empavonado / Incoloro 4 + 10 + 4"
      : "Cristal Templado Incoloro 5mm");

  if (anchoAlto) {
    pieces.push({
      code,
      name,
      quantity: parseQuantity(quantityMatches[0]?.[1] ?? "1") ?? 1,
      widthMm: parseMm(anchoAlto[1] ?? "") ?? 0,
      heightMm: parseMm(anchoAlto[2] ?? "") ?? 0,
    });
    return pieces.filter((item) => item.code && item.widthMm > 0 && item.heightMm > 0);
  }

  pairs.forEach((pair, index) => {
    pieces.push({
      code,
      name,
      quantity: parseQuantity(quantityMatches[index]?.[1] ?? quantityMatches[0]?.[1] ?? "1") ?? 1,
      widthMm: parseMm(pair[1] ?? "") ?? 0,
      heightMm: parseMm(pair[2] ?? "") ?? 0,
    });
  });

  return pieces.filter((item) => item.code && item.widthMm > 0 && item.heightMm > 0);
}

export function parseHardwareFromText(text: string): HardwareItem[] {
  const line =
    text.split(/\r?\n/).find((item) => /accesorios:/i.test(item)) ??
    text.split(/\r?\n/).find((item) => /PZA|TUBO|\bM\b/.test(item) && /;/.test(item));
  if (!line) return [];

  const payload = line
    .replace(/^[^:]*:\s*/, "")
    .replace(/[*`]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return payload
    .split(";")
    .map((chunk) => chunk.trim().replace(/[.\s]+$/, "").trim())
    .filter(Boolean)
    .map((chunk) => {
      const match = chunk.match(/^(\S+)\s+(.+?)\s+(\d+(?:[.,]\d+)?)\s+([A-Za-zÁÉÍÓÚÜÑ]+)$/u);
      if (!match) {
        return {
          code: chunk.split(/\s+/)[0] ?? chunk,
          name: chunk,
          quantity: 0,
          unit: "PZA",
        };
      }
      return {
        code: match[1],
        name: match[2],
        quantity: parseQuantity(match[3]) ?? 0,
        unit: match[4].toUpperCase(),
      };
    })
    .filter((item) => item.code && item.quantity > 0 && !/^\*+$/.test(item.code));
}

function extractMeta(text: string): Pick<ExtractedPlan, "lineName" | "leaves" | "widthMm" | "heightMm" | "glazing" | "glassCode"> {
  const lineName =
    text.match(/L-25[^\n|]+/i)?.[0]?.trim().replace(/\s{2,}/g, " ") ??
    text.match(/l[ií]nea[:\s]+([^\n]+)/i)?.[1]?.trim() ??
    null;
  const leaves = parseQuantity(text.match(/(\d)\s*H\b/i)?.[1] ?? "");
  const size = text.match(/(\d{3,4})\s*[×x]\s*(\d{3,4})/);
  const glazing: GlazingType | null = lineName ? inferGlazing(lineName) : null;
  const glassCode = text.match(/\b(CTI5|TE4104)\b/i)?.[1]?.toUpperCase() ?? null;
  return {
    lineName,
    leaves,
    widthMm: size ? Number(size[1]) : null,
    heightMm: size ? Number(size[2]) : null,
    glazing,
    glassCode,
  };
}

export function parsePlanFromText(text: string): ExtractedPlan {
  const meta = extractMeta(text);
  const warnings: string[] = [];
  const profiles = parseProfileTable(text);
  const glass = parseGlassFromText(text, meta.glassCode);
  const hardware = parseHardwareFromText(text);

  if (profiles.length === 0) warnings.push("No se leyeron perfiles del Plan.");
  if (glass.length === 0) warnings.push("No se leyó vidrio del Plan.");
  if (hardware.length === 0) warnings.push("No se leyeron accesorios del Plan.");

  return {
    ...meta,
    profiles,
    glass,
    hardware,
    planText: text,
    planHtml: "",
    warnings,
  };
}

export async function parsePlanFromPageTables(page: Page): Promise<ExtractedPlan> {
  const tableRows = await page.locator("table tr").evaluateAll((rows) =>
    rows.map((row) =>
      [...row.querySelectorAll("th,td")].map((cell) => (cell.textContent ?? "").replace(/\s+/g, " ").trim()),
    ),
  );
  const textLines = tableRows.map((cells) => cells.join(" | ")).join("\n");
  const bodyText = await page.locator("body").innerText().catch(() => textLines);
  const parsed = parsePlanFromText(`${bodyText}\n${textLines}`);
  parsed.planHtml = await page.content();
  parsed.planText = bodyText;
  return parsed;
}

export function parsePlanFromHtml(html: string): ExtractedPlan {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(tr|p|div|h\d|li)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/t[dh]>/gi, " | ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .trim();
  const parsed = parsePlanFromText(text);
  return { ...parsed, planHtml: html };
}
