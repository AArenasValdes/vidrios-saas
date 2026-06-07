import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";

const DEFAULT_DETAIL_PAGE_SIZE = 5;
const COVER_DETAIL_LIMIT = 2;
const MEDIUM_DESCRIPTION_DETAIL_LIMIT = 1;
const SHORT_DESCRIPTION_MAX_CHARS = 420;
const MEDIUM_DESCRIPTION_MAX_CHARS = 700;
const SHORT_DESCRIPTION_MAX_LINES = 4;
const MEDIUM_DESCRIPTION_MAX_LINES = 6;

export type TotalGlobalPrintPagePlan =
  | {
      kind: "global-cover";
      description: string;
      startIndex: number;
      items: CotizacionWorkflowItem[];
    }
  | {
      kind: "global-description";
      description: string;
      chunkIndex: number;
    }
  | {
      kind: "global-details";
      startIndex: number;
      items: CotizacionWorkflowItem[];
    };

function countDescriptionLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean).length;
}

function resolveCoverDetailCapacity(descriptionChunks: string[], itemCount: number) {
  if (itemCount <= 0 || descriptionChunks.length !== 1) {
    return 0;
  }

  const description = descriptionChunks[0]?.trim() ?? "";
  const lineCount = countDescriptionLines(description);

  if (
    description.length <= SHORT_DESCRIPTION_MAX_CHARS &&
    lineCount <= SHORT_DESCRIPTION_MAX_LINES
  ) {
    return Math.min(COVER_DETAIL_LIMIT, itemCount);
  }

  if (
    description.length <= MEDIUM_DESCRIPTION_MAX_CHARS &&
    lineCount <= MEDIUM_DESCRIPTION_MAX_LINES
  ) {
    return Math.min(MEDIUM_DESCRIPTION_DETAIL_LIMIT, itemCount);
  }

  return 0;
}

function buildDetailPages(
  items: CotizacionWorkflowItem[],
  startOffset: number,
  perPage: number
) {
  const pages: TotalGlobalPrintPagePlan[] = [];

  for (let startIndex = 0; startIndex < items.length; startIndex += perPage) {
    pages.push({
      kind: "global-details",
      startIndex: startOffset + startIndex,
      items: items.slice(startIndex, startIndex + perPage),
    });
  }

  return pages;
}

export function buildTotalGlobalPrintPlan({
  descriptionChunks,
  items,
  detailPageSize = DEFAULT_DETAIL_PAGE_SIZE,
}: {
  descriptionChunks: string[];
  items: CotizacionWorkflowItem[];
  detailPageSize?: number;
}): TotalGlobalPrintPagePlan[] {
  const normalizedDescriptionChunks =
    descriptionChunks.length > 0 ? descriptionChunks : [""];
  const coverDetailCount = resolveCoverDetailCapacity(
    normalizedDescriptionChunks,
    items.length
  );
  const coverItems = items.slice(0, coverDetailCount);
  const remainingItems = items.slice(coverDetailCount);
  const descriptionPages: TotalGlobalPrintPagePlan[] =
    normalizedDescriptionChunks.map((description, index) =>
      index === 0
        ? {
            kind: "global-cover",
            description,
            startIndex: 0,
            items: coverItems,
          }
        : {
            kind: "global-description",
            description,
            chunkIndex: index,
          }
    );
  const detailPages = buildDetailPages(
    remainingItems,
    coverDetailCount,
    detailPageSize
  );

  return [...descriptionPages, ...detailPages];
}
