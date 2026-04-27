import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";

const NORMAL_PAGE_COMPONENTS = 3;
const SUMMARY_PAGE_COMPONENTS = 2;

export type PrintPagePlan =
  | {
      kind: "cover";
      startIndex: number;
      items: CotizacionWorkflowItem[];
    }
  | {
      kind: "components";
      startIndex: number;
      items: CotizacionWorkflowItem[];
    };

function distributeBeforeSummaryPage(totalItems: number) {
  for (
    let pageCount = Math.ceil(totalItems / NORMAL_PAGE_COMPONENTS);
    pageCount <= totalItems;
    pageCount += 1
  ) {
    for (const summaryCount of [SUMMARY_PAGE_COMPONENTS, 1]) {
      const pagesBeforeSummary = pageCount - 1;

      if (pagesBeforeSummary <= 0) {
        continue;
      }

      const beforeSummaryCount = totalItems - summaryCount;
      const minBeforeSummary = pagesBeforeSummary * SUMMARY_PAGE_COMPONENTS;
      const maxBeforeSummary = pagesBeforeSummary * NORMAL_PAGE_COMPONENTS;

      if (
        beforeSummaryCount < minBeforeSummary ||
        beforeSummaryCount > maxBeforeSummary
      ) {
        continue;
      }

      const counts = Array.from({ length: pagesBeforeSummary }, () => SUMMARY_PAGE_COMPONENTS);
      let extraItems = beforeSummaryCount - minBeforeSummary;

      for (let index = 0; index < counts.length && extraItems > 0; index += 1) {
        counts[index] += 1;
        extraItems -= 1;
      }

      return [...counts, summaryCount];
    }
  }

  return [totalItems];
}

function buildPageGroups<T>(items: T[]) {
  if (items.length <= SUMMARY_PAGE_COMPONENTS) {
    return [items];
  }

  const counts = distributeBeforeSummaryPage(items.length);
  let startIndex = 0;

  return counts.map((count) => {
    const group = items.slice(startIndex, startIndex + count);
    startIndex += count;
    return group;
  });
}

export function buildPrintPlan(items: CotizacionWorkflowItem[]): PrintPagePlan[] {
  if (items.length === 0) {
    return [
      {
        kind: "cover",
        startIndex: 0,
        items: [],
      },
    ];
  }

  const componentGroups = buildPageGroups(items);

  let startIndex = 0;

  return componentGroups.map((group, index) => {
    const pagePlan: PrintPagePlan = {
      kind: index === 0 ? "cover" : "components",
      startIndex,
      items: Array.from(group),
    };

    startIndex += group.length;

    return pagePlan;
  });
}
