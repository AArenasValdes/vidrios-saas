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
  actionLabel: "Enviar link por WhatsApp",
  helperText:
    "En escritorio abrimos WhatsApp con el link publico de la cotizacion para que el cliente la revise, descargue el PDF y responda desde el enlace.",
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
      actionLabel: "Enviar PDF por WhatsApp",
      helperText:
        "En Android intentamos adjuntar el PDF directo en WhatsApp. Si el sistema no lo permite, abrimos el mensaje de respaldo con el link para responder.",
    };
  }

  if (input.isLikelyMobile) {
    return {
      canSharePdf: false,
      isLikelyMobile: true,
      actionLabel: "Enviar link por WhatsApp",
      helperText:
        "Tu telefono no permite adjuntar el PDF directo desde esta vista. Abrimos WhatsApp con el link publico y el mensaje listo como respaldo.",
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
