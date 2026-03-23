import type { CotizacionWorkflowRecord } from "@/types/cotizacion-workflow";

function sanitizeFileNamePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export function buildCotizacionPdfFileName(record: CotizacionWorkflowRecord) {
  const obra = sanitizeFileNamePart(record.obra) || "proyecto";
  return `${record.codigo.toLowerCase()}-${obra}.pdf`;
}

type ExportCotizacionPdfInput = {
  element: HTMLElement;
  fileName: string;
  format?: "a4" | "legal" | [number, number];
  cacheKey?: string;
  protectedSelectors?: string[];
  pageSelector?: string;
  runningHeader?: {
    brand: string;
    subtitle?: string;
    code?: string;
    dateLabel?: string;
    brandColor?: string;
  };
};

type ProtectedBlock = {
  top: number;
  bottom: number;
};

type PageSlice = {
  start: number;
  end: number;
};

const PDF_BLOB_CACHE = new Map<string, Promise<Blob>>();
const EXPORT_ROOT_ATTR = "data-cotizacion-export-root";

type CanvasScaleInput = {
  width: number;
  height: number;
  devicePixelRatio?: number;
  userAgent?: string;
};

type RenderSizeInput = {
  rectWidth: number;
  rectHeight: number;
  scrollWidth?: number;
  scrollHeight?: number;
  offsetWidth?: number;
  offsetHeight?: number;
  clientWidth?: number;
  clientHeight?: number;
  computedWidth?: string;
  computedHeight?: string;
};

export function formatCotizacionPdfError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (error && typeof error === "object") {
    try {
      return JSON.stringify(error);
    } catch {
      return "Error desconocido al preparar el PDF";
    }
  }

  return "Error desconocido al preparar el PDF";
}

function parseCssPixels(value?: string) {
  if (!value) {
    return 0;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function resolveCotizacionPdfRenderSize(input: RenderSizeInput) {
  const width = Math.max(
    1,
    Math.ceil(
      Math.max(
        input.rectWidth,
        input.scrollWidth ?? 0,
        input.offsetWidth ?? 0,
        input.clientWidth ?? 0,
        parseCssPixels(input.computedWidth)
      )
    )
  );
  const height = Math.max(
    1,
    Math.ceil(
      Math.max(
        input.rectHeight,
        input.scrollHeight ?? 0,
        input.offsetHeight ?? 0,
        input.clientHeight ?? 0,
        parseCssPixels(input.computedHeight)
      )
    )
  );

  return { width, height };
}

function isAppleMobileUserAgent(userAgent: string) {
  return /iPhone|iPad|iPod/i.test(userAgent);
}

export function resolveCotizacionPdfCanvasScale({
  width,
  height,
  devicePixelRatio = 1,
  userAgent = "",
}: CanvasScaleInput) {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const safeDevicePixelRatio = Math.max(1, devicePixelRatio);
  const isAppleMobile = isAppleMobileUserAgent(userAgent);
  const desiredScale = isAppleMobile
    ? Math.min(2.4, Math.max(1.8, safeDevicePixelRatio))
    : Math.min(4, Math.max(3, safeDevicePixelRatio * 2));
  const maxCanvasArea = isAppleMobile ? 7_500_000 : 14_000_000;
  const maxCanvasEdge = isAppleMobile ? 3072 : 8192;
  const areaLimitedScale = Math.sqrt(maxCanvasArea / (safeWidth * safeHeight));
  const edgeLimitedScale = maxCanvasEdge / Math.max(safeWidth, safeHeight);

  return Number(
    Math.max(1, Math.min(desiredScale, areaLimitedScale, edgeLimitedScale)).toFixed(2)
  );
}

async function waitForElementImages(element: HTMLElement) {
  const images = Array.from(element.querySelectorAll<HTMLImageElement>("img"));

  await Promise.all(
    images.map(async (image) => {
      if (image.complete && image.naturalWidth > 0) {
        return;
      }

      if (typeof image.decode === "function") {
        try {
          await image.decode();
          return;
        } catch {
          // Fallback below.
        }
      }

      await new Promise<void>((resolve) => {
        const handleDone = () => {
          image.removeEventListener("load", handleDone);
          image.removeEventListener("error", handleDone);
          resolve();
        };

        image.addEventListener("load", handleDone, { once: true });
        image.addEventListener("error", handleDone, { once: true });
      });
    })
  );
}

async function waitForDocumentFonts() {
  if (typeof document === "undefined" || !("fonts" in document)) {
    return;
  }

  try {
    await (document.fonts as FontFaceSet).ready;
  } catch {
    // Ignore font readiness failures and continue rendering.
  }
}

export function planPdfPageSlices(input: {
  canvasHeight: number;
  pageHeight: number;
  firstPageHeight?: number;
  protectedBlocks?: ProtectedBlock[];
}) {
  const slices: PageSlice[] = [];
  const protectedBlocks = [...(input.protectedBlocks ?? [])].sort(
    (left, right) => left.top - right.top
  );

  let currentStart = 0;
  let pageIndex = 0;

  while (currentStart < input.canvasHeight) {
    const currentPageHeight =
      pageIndex === 0 ? input.firstPageHeight ?? input.pageHeight : input.pageHeight;
    const minSliceHeight = Math.floor(currentPageHeight * 0.28);
    const preferredBottomGap = Math.floor(currentPageHeight * 0.08);
    let currentEnd = Math.min(currentStart + currentPageHeight, input.canvasHeight);

    if (currentEnd < input.canvasHeight) {
      const tightFitBlock = protectedBlocks.find((block) => {
        const remainingSpace = currentEnd - block.bottom;

        return (
          block.top > currentStart &&
          block.bottom <= currentEnd &&
          remainingSpace >= 0 &&
          remainingSpace < preferredBottomGap &&
          block.top - currentStart >= minSliceHeight
        );
      });

      if (tightFitBlock) {
        currentEnd = tightFitBlock.top;
      }

      const blocking = protectedBlocks.find((block) => {
        return (
          block.top > currentStart &&
          block.top < currentEnd &&
          block.bottom > currentEnd
        );
      });

      if (blocking) {
        const safeEnd = Math.max(currentStart + minSliceHeight, blocking.top);

        if (safeEnd > currentStart && safeEnd < currentEnd) {
          currentEnd = safeEnd;
        }
      }
    }

    if (currentEnd <= currentStart) {
      currentEnd = Math.min(currentStart + input.pageHeight, input.canvasHeight);
    }

    slices.push({ start: currentStart, end: currentEnd });
    currentStart = currentEnd;
    pageIndex += 1;
  }

  return slices;
}

function collectProtectedBlocks(element: HTMLElement, selectors: string[]) {
  const rootRect = element.getBoundingClientRect();

  return selectors.flatMap((selector) => {
    return Array.from(element.querySelectorAll<HTMLElement>(selector)).map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        top: rect.top - rootRect.top,
        bottom: rect.bottom - rootRect.top,
      };
    });
  });
}

export async function exportCotizacionElementToPdf({
  element,
  fileName,
  format = "a4",
  cacheKey,
  protectedSelectors = [],
  pageSelector,
  runningHeader,
}: ExportCotizacionPdfInput) {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  await waitForElementImages(element);
  await waitForDocumentFonts();

  const buildBlob = async () => {
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format,
      compress: false,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const renderElementToCanvas = (target: HTMLElement) => {
      const rect = target.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(target);
      const { width, height } = resolveCotizacionPdfRenderSize({
        rectWidth: rect.width,
        rectHeight: rect.height,
        scrollWidth: target.scrollWidth,
        scrollHeight: target.scrollHeight,
        offsetWidth: target.offsetWidth,
        offsetHeight: target.offsetHeight,
        clientWidth: target.clientWidth,
        clientHeight: target.clientHeight,
        computedWidth: computedStyle.width,
        computedHeight: computedStyle.height,
      });
      const scale = resolveCotizacionPdfCanvasScale({
        width,
        height,
        devicePixelRatio:
          typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      });

      target.setAttribute(EXPORT_ROOT_ATTR, "true");

      return html2canvas(target, {
        backgroundColor: "#ffffff",
        scale,
        useCORS: true,
        logging: false,
        windowWidth: width,
        windowHeight: height,
        width,
        height,
        onclone: (clonedDocument) => {
          clonedDocument.documentElement.style.width = `${width}px`;
          clonedDocument.documentElement.style.minWidth = `${width}px`;
          clonedDocument.documentElement.style.webkitTextSizeAdjust = "100%";
          clonedDocument.documentElement.style.setProperty("text-size-adjust", "100%");
          clonedDocument.body.style.width = `${width}px`;
          clonedDocument.body.style.minWidth = `${width}px`;
          clonedDocument.body.style.margin = "0";
          clonedDocument.body.style.webkitTextSizeAdjust = "100%";
          clonedDocument.body.style.setProperty("text-size-adjust", "100%");

          const clonedTarget = clonedDocument.querySelector<HTMLElement>(
            `[${EXPORT_ROOT_ATTR}="true"]`
          );

          if (clonedTarget) {
            clonedTarget.style.transform = "none";
            clonedTarget.style.width = `${width}px`;
            clonedTarget.style.maxWidth = `${width}px`;
            clonedTarget.style.minWidth = `${width}px`;
            clonedTarget.style.margin = "0";

            let ancestor = clonedTarget.parentElement;

            while (ancestor && ancestor !== clonedDocument.body) {
              ancestor.style.transform = "none";
              ancestor.style.width = "auto";
              ancestor.style.maxWidth = "none";
              ancestor.style.minWidth = "0";
              ancestor.style.height = "auto";
              ancestor.style.maxHeight = "none";
              ancestor.style.overflow = "visible";
              ancestor = ancestor.parentElement;
            }
          }
        },
      }).finally(() => {
        target.removeAttribute(EXPORT_ROOT_ATTR);
      });
    };

    if (pageSelector) {
      const pageNodes = Array.from(element.querySelectorAll<HTMLElement>(pageSelector));
      const targets = pageNodes.length > 0 ? pageNodes : [element];

      for (const [index, target] of targets.entries()) {
        const canvas = await renderElementToCanvas(target);

        if (index > 0) {
          pdf.addPage();
        }

        pdf.addImage(canvas, "PNG", 0, 0, pageWidth, pageHeight, undefined, "FAST");
      }

      return pdf.output("blob");
    }

    const protectedBlocks = collectProtectedBlocks(element, protectedSelectors);
    const canvas = await renderElementToCanvas(element);
    const margin = 8;
    const headerHeight = runningHeader ? 12 : 0;
    const printableWidth = pageWidth - margin * 2;
    const printableHeight = pageHeight - margin * 2 - headerHeight;
    const pxPerMm = canvas.width / printableWidth;
    const pageCanvasHeight = Math.max(1, Math.floor(printableHeight * pxPerMm));
    const canvasScaleY = canvas.height / Math.max(element.scrollHeight, 1);
    const pageSlices = planPdfPageSlices({
      canvasHeight: canvas.height,
      pageHeight: pageCanvasHeight,
      firstPageHeight: pageCanvasHeight,
      protectedBlocks: protectedBlocks.map((block) => ({
        top: Math.round(block.top * canvasScaleY),
        bottom: Math.round(block.bottom * canvasScaleY),
      })),
    });

    pageSlices.forEach((slice, pageIndex) => {
      const currentSliceHeight = slice.end - slice.start;
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = currentSliceHeight;

      const context = pageCanvas.getContext("2d");

      if (!context) {
        throw new Error("No se pudo preparar el canvas para exportar el PDF");
      }

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      context.drawImage(
        canvas,
        0,
        slice.start,
        canvas.width,
        currentSliceHeight,
        0,
        0,
        canvas.width,
        currentSliceHeight
      );

      const sliceHeightMm = currentSliceHeight / pxPerMm;

      if (pageIndex > 0) {
        pdf.addPage();
      }

      if (runningHeader) {
        pdf.setDrawColor(217, 224, 234);
        pdf.setLineWidth(0.3);
        pdf.line(
          margin,
          margin + headerHeight - 2,
          pageWidth - margin,
          margin + headerHeight - 2
        );
        const brandColor = runningHeader.brandColor ?? "#1a3a5c";
        const red = Number.parseInt(brandColor.slice(1, 3), 16);
        const green = Number.parseInt(brandColor.slice(3, 5), 16);
        const blue = Number.parseInt(brandColor.slice(5, 7), 16);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        pdf.setTextColor(red, green, blue);
        pdf.text(runningHeader.brand, margin, margin + 4.5);

        if (runningHeader.subtitle) {
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(7.5);
          pdf.setTextColor(102, 112, 133);
          pdf.text(runningHeader.subtitle, margin, margin + 8.5);
        }

        const rightLines = [runningHeader.dateLabel, runningHeader.code].filter(Boolean) as string[];
        let currentY = margin + 4.5;

        rightLines.forEach((line, index) => {
          pdf.setFont("helvetica", index === rightLines.length - 1 ? "bold" : "normal");
          pdf.setFontSize(index === rightLines.length - 1 ? 9 : 7.5);
          pdf.setTextColor(
            index === rightLines.length - 1 ? red : 102,
            index === rightLines.length - 1 ? green : 112,
            index === rightLines.length - 1 ? blue : 133
          );
          pdf.text(line, pageWidth - margin, currentY, { align: "right" });
          currentY += 4;
        });
      }

      pdf.addImage(
        pageCanvas,
        "JPEG",
        margin,
        margin + headerHeight,
        printableWidth,
        sliceHeightMm,
        undefined,
        "FAST"
      );

      const currentPage = String(pageIndex + 1).padStart(2, "0");
      const totalPages = String(pageSlices.length).padStart(2, "0");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.setTextColor(102, 112, 133);
      pdf.text(`${currentPage}/${totalPages}`, pageWidth - margin, pageHeight - 3, {
        align: "right",
      });
    });

    return pdf.output("blob");
  };

  const blob = await (cacheKey
    ? (() => {
        const cached = PDF_BLOB_CACHE.get(cacheKey);

        if (cached) {
          return cached;
        }

        const pending = buildBlob().catch((error) => {
          PDF_BLOB_CACHE.delete(cacheKey);
          throw error;
        });
        PDF_BLOB_CACHE.set(cacheKey, pending);
        return pending;
      })()
    : buildBlob());
  const file = new File([blob], fileName, { type: "application/pdf" });

  return { blob, file };
}

export function canSharePdfFile(file: File) {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return false;
  }

  if (typeof navigator.canShare !== "function") {
    return false;
  }

  return navigator.canShare({ files: [file] });
}

export function requiresPdfOpenFallback(userAgent = "") {
  return /iPhone|iPad|iPod/i.test(userAgent);
}

type DownloadPdfBlobOptions = {
  fallbackUrl?: string;
  userAgent?: string;
  targetWindow?: Window | null;
};

export function downloadPdfBlob(
  blob: Blob,
  fileName: string,
  options: DownloadPdfBlobOptions = {}
) {
  const userAgent =
    options.userAgent ??
    (typeof navigator !== "undefined" ? navigator.userAgent : "");
  const mustOpenPdf =
    requiresPdfOpenFallback(userAgent) && typeof window !== "undefined";

  const openPdfTarget = (url: string) => {
    if (options.targetWindow && !options.targetWindow.closed) {
      options.targetWindow.location.href = url;
      return true;
    }

    const openedWindow = window.open(url, "_blank", "noopener,noreferrer");

    if (openedWindow) {
      return true;
    }

    if (typeof window.location?.assign === "function") {
      window.location.assign(url);
      return true;
    }

    return false;
  };

  if (mustOpenPdf && options.fallbackUrl) {
    return openPdfTarget(options.fallbackUrl) ? "opened_fallback" : "failed";
  }

  const objectUrl = window.URL.createObjectURL(blob);

  if (mustOpenPdf) {
    const opened = openPdfTarget(objectUrl);

    if (opened) {
      window.setTimeout(() => {
        window.URL.revokeObjectURL(objectUrl);
      }, 60_000);

      return "opened_blob";
    }

    window.URL.revokeObjectURL(objectUrl);
    return "failed";
  }

  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();

  window.setTimeout(() => {
    window.URL.revokeObjectURL(objectUrl);
  }, 1000);

  return "downloaded";
}

type ShareCotizacionPdfInput = {
  file: File;
  title: string;
  text: string;
};

export async function shareCotizacionPdf({
  file,
  title,
  text,
}: ShareCotizacionPdfInput) {
  if (!canSharePdfFile(file)) {
    return false;
  }

  await navigator.share({
    title,
    text,
    files: [file],
  });

  return true;
}
