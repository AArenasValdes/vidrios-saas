import { canSharePdfFile } from "@/utils/cotizacion-pdf";

type DeviceHints = {
  userAgent: string;
  maxTouchPoints: number;
  screenWidth: number;
};

export type CotizacionShareExperience = {
  canSharePdf: boolean;
  isLikelyMobile: boolean;
  actionLabel: string;
  helperText: string;
};

export const DEFAULT_COTIZACION_SHARE_EXPERIENCE: CotizacionShareExperience = {
  canSharePdf: false,
  isLikelyMobile: false,
  actionLabel: "Compartir por WhatsApp",
  helperText:
    "Abrimos el mensaje de WhatsApp con el texto listo. Si luego quieres adjuntar el PDF, puedes hacerlo manualmente.",
};

export function detectLikelyMobileDevice({
  userAgent,
  maxTouchPoints,
  screenWidth,
}: DeviceHints) {
  const mobileUa =
    /android|iphone|ipad|ipod|mobile|windows phone/i.test(userAgent);

  if (mobileUa) {
    return true;
  }

  return maxTouchPoints > 1 && screenWidth <= 1024;
}

export function resolveCotizacionShareExperience(input: {
  canSharePdf: boolean;
  isLikelyMobile: boolean;
}): CotizacionShareExperience {
  if (input.canSharePdf) {
    return {
      canSharePdf: true,
      isLikelyMobile: input.isLikelyMobile,
      actionLabel: "Compartir por WhatsApp",
      helperText:
        "Intentamos compartir el presupuesto desde tu celular. Si el archivo no se adjunta, abrimos WhatsApp como respaldo.",
    };
  }

  if (input.isLikelyMobile) {
    return {
      canSharePdf: false,
      isLikelyMobile: true,
      actionLabel: "Compartir por WhatsApp",
      helperText:
        "Abrimos las apps disponibles en tu telefono. Si WhatsApp no puede adjuntar el archivo, dejamos el mensaje listo como respaldo.",
    };
  }

  return DEFAULT_COTIZACION_SHARE_EXPERIENCE;
}

export function getCotizacionShareExperience(): CotizacionShareExperience {
  if (
    typeof window === "undefined" ||
    typeof navigator === "undefined" ||
    typeof File === "undefined"
  ) {
    return DEFAULT_COTIZACION_SHARE_EXPERIENCE;
  }

  const file = new File(["share-check"], "cotizacion.pdf", {
    type: "application/pdf",
  });

  return resolveCotizacionShareExperience({
    canSharePdf: canSharePdfFile(file),
    isLikelyMobile: detectLikelyMobileDevice({
      userAgent: navigator.userAgent,
      maxTouchPoints: navigator.maxTouchPoints || 0,
      screenWidth: window.innerWidth,
    }),
  });
}
