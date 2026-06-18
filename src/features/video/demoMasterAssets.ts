import { staticFile } from "remotion";

const demoBase = "video-assets/demo-master";

export const ventoraDemoMasterAssets = {
  logo: staticFile("video-assets/logo-ventora.svg"),
  login: staticFile(`${demoBase}/login.png`),
  dashboard: staticFile(`${demoBase}/dashboard.png`),
  clientes: staticFile(`${demoBase}/clientes.png`),
  solicitudes: staticFile(`${demoBase}/solicitudes.png`),
  canalesQr: staticFile(`${demoBase}/canales-qr.png`),
  cotizaciones: staticFile(`${demoBase}/cotizaciones.png`),
  nuevaCotizacion: staticFile(`${demoBase}/nueva-cotizacion.png`),
  configuracionEmpresa: staticFile(`${demoBase}/configuracion-empresa.png`),
  configuracionPagina: staticFile(`${demoBase}/configuracion-pagina.png`),
  paginaPublica: staticFile(`${demoBase}/pagina-publica.png`),
  presupuestoPublico: staticFile(`${demoBase}/presupuesto-publico.png`),
  pdfProfesional: staticFile(`${demoBase}/pdf-profesional.png`),
  fallbackLink: staticFile("video-assets/mockup-link-comercial.png"),
  fallbackSolicitud: staticFile("video-assets/mockup-formulario-solicitud.png"),
  fallbackPanel: staticFile("video-assets/mockup-panel-solicitudes.png"),
  fallbackCotizacion: staticFile("video-assets/mockup-cotizacion.png"),
} as const;

export type VentoraDemoMasterAssetKey = keyof typeof ventoraDemoMasterAssets;

export const ventoraDemoMasterFallbackAssets = {
  login: ventoraDemoMasterAssets.fallbackPanel,
  dashboard: ventoraDemoMasterAssets.fallbackPanel,
  clientes: ventoraDemoMasterAssets.fallbackPanel,
  solicitudes: ventoraDemoMasterAssets.fallbackPanel,
  canalesQr: ventoraDemoMasterAssets.fallbackLink,
  cotizaciones: ventoraDemoMasterAssets.fallbackCotizacion,
  nuevaCotizacion: ventoraDemoMasterAssets.fallbackCotizacion,
  configuracionEmpresa: ventoraDemoMasterAssets.fallbackPanel,
  configuracionPagina: ventoraDemoMasterAssets.fallbackLink,
  paginaPublica: ventoraDemoMasterAssets.fallbackSolicitud,
  presupuestoPublico: ventoraDemoMasterAssets.fallbackCotizacion,
  pdfProfesional: ventoraDemoMasterAssets.fallbackCotizacion,
} as const;
