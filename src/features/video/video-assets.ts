import { staticFile } from "remotion";

// Replace these assets with fresh exports when the video needs an update.
// The file names stay stable so scenes can keep pointing to the same paths.
export const ventoraVideoAssets = {
  logo: staticFile("video-assets/logo-ventora.svg"),
  linkComercial: staticFile("video-assets/mockup-link-comercial.png"),
  formularioSolicitud: staticFile("video-assets/mockup-formulario-solicitud.png"),
  panelSolicitudes: staticFile("video-assets/mockup-panel-solicitudes.png"),
  cotizacion: staticFile("video-assets/mockup-cotizacion.png"),
} as const;

export type VentoraVideoLayout = "landscape" | "portrait";

export const VENTORA_VIDEO_FPS = 30;

export const VENTORA_VIDEO_DURATIONS = {
  hook: 180,
  dolor: 180,
  intro: 180,
  link: 240,
  solicitud: 240,
  panel: 240,
  accion: 180,
  cierre: 180,
} as const;

export const ventoraVoiceGuide = [
  "Cuando trabajas en terreno, muchas consultas llegan por WhatsApp, llamadas o redes sociales.",
  "El problema es que entre audios, fotos y medidas, mas de un cliente se puede perder.",
  "Ventora te entrega un link comercial para recibir solicitudes ordenadas, incluso cuando estas ocupado.",
  "El cliente deja sus datos, el tipo de trabajo y las medidas desde su celular.",
  "Despues, todo queda guardado en tu panel de solicitudes.",
  "Desde ahi puedes contactar por WhatsApp, crear una cotizacion y seguir el estado del cliente.",
  "Ventora te ayuda a ordenar tus consultas y cerrar mas trabajos sin depender del desorden de WhatsApp.",
] as const;

