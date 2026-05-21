import type { GrowthWorkspace } from "@/features/growth/types/growth-dashboard";

const STORAGE_KEY = "ventora:growth-workspace:v2";

const DEFAULT_WORKSPACE: GrowthWorkspace = {
  settings: {
    periodStartDate: "2026-05-21",
    periodEndDate: "2026-06-30",
    monthlyMrrGoalClp: 120000,
    monthlyPaidGoal: 12,
    monthlyPilotGoal: 8,
    dailyContactGoal: 6,
    monthlyPriceClp: 10000,
    annualPriceClp: 100000,
    activeChannels: [
      "Facebook",
      "Instagram",
      "Google Maps",
      "WhatsApp",
      "TikTok",
      "Referidos",
    ],
    priorityRegions: ["Coquimbo", "Biobio", "Araucania", "RM", "Valparaiso"],
  },
  manualMetrics: {
    mrrActualClp: 0,
    clientesPagadosActuales: 0,
    pilotosActivosActuales: 0,
    notas:
      "Prospectos cargados desde investigacion manual real. Completa MRR, pagos y pilotos con tus numeros actuales.",
    dataStatus: "manual",
  },
  prospects: [
    {
      id: "prospecto-vidrieria-la-serena",
      empresa: "Vidrieria La Serena",
      rubro: "Shower door",
      canal: "Facebook",
      contactoPublico: "WhatsApp +56 9 8608 7397",
      regionComuna: "La Serena / Coquimbo",
      score: "9/10",
      estado: "Nuevo",
      prioridad: "A1",
      porQueCalza:
        "Hace shower door y trabajos a medida; perfil ideal para cotizar rapido por celular.",
      anguloPrimerMensaje:
        "Vi que hacen shower door a medida en La Serena. Ventora les puede ayudar a responder solicitudes y cotizar mas rapido sin perder consultas por WhatsApp.",
      fuenteUrl:
        "https://www.facebook.com/vidrierialaserena/posts/shower-door-acrilico-modelo-paloma-/164098675388798/?utm_source=chatgpt.com",
      proximoPaso: "Enviar mensaje personalizado por WhatsApp",
      fechaProximoContacto: "2026-05-21",
      dataStatus: "real",
      createdAt: "2026-05-21T10:00:00.000Z",
      updatedAt: "2026-05-21T10:00:00.000Z",
    },
    {
      id: "prospecto-dubal-glass",
      empresa: "Dubal Glass",
      rubro: "Shower door",
      canal: "Facebook",
      contactoPublico: "WhatsApp +56 9 6856 7420",
      regionComuna: "Chile",
      score: "9/10",
      estado: "Nuevo",
      prioridad: "A1",
      porQueCalza:
        "Publica fabricacion de shower door a medida y presupuesto gratis; dolor claro de recepcion y seguimiento de solicitudes.",
      anguloPrimerMensaje:
        "Vi que ofrecen presupuesto gratis para shower door. Ventora les puede ordenar esas solicitudes y convertirlas en cotizaciones profesionales en minutos.",
      fuenteUrl:
        "https://www.facebook.com/dubalglass/posts/-fabricacion-de-shower-door-a-medida-olv%C3%ADdate-de-tu-vieja-cortina-te-ofrecemos-l/2268958179999142/?utm_source=chatgpt.com",
      proximoPaso: "Enviar mensaje personalizado por WhatsApp",
      fechaProximoContacto: "2026-05-21",
      dataStatus: "real",
      createdAt: "2026-05-21T10:01:00.000Z",
      updatedAt: "2026-05-21T10:01:00.000Z",
    },
    {
      id: "prospecto-ventanas-pvc-concepcion",
      empresa: "Ventanas PVC Concepcion",
      rubro: "PVC y termopanel",
      canal: "WhatsApp",
      contactoPublico: "WhatsApp +56 9 9421 7374",
      regionComuna: "Concepcion / Biobio",
      score: "9/10",
      estado: "Nuevo",
      prioridad: "A1",
      porQueCalza:
        "Fabrican ventanas PVC/aluminio y termopanel a medida; atienden varias comunas y necesitan gestion comercial.",
      anguloPrimerMensaje:
        "Como atienden varias comunas del Gran Concepcion, Ventora puede ayudarles a no perder consultas y hacer seguimiento por proyecto.",
      fuenteUrl: "https://www.ventanaspvcconcepcion.cl/?utm_source=chatgpt.com",
      proximoPaso: "Escribir primer mensaje con foco en varias comunas",
      fechaProximoContacto: "2026-05-21",
      dataStatus: "real",
      createdAt: "2026-05-21T10:02:00.000Z",
      updatedAt: "2026-05-21T10:02:00.000Z",
    },
    {
      id: "prospecto-ventanas-2001",
      empresa: "Ventanas 2001",
      rubro: "Vidrieria y termopanel",
      canal: "WhatsApp",
      contactoPublico: "WhatsApp +56 9 6693 1428 / +56 9 7727 4577",
      regionComuna: "Temuco / Araucania",
      score: "9/10",
      estado: "Nuevo",
      prioridad: "A1",
      porQueCalza:
        "Tiene dos lineas comerciales visibles: vidrieria y termopaneles. Buen candidato para ordenar clientes, lineas y cotizaciones.",
      anguloPrimerMensaje:
        "Vi que manejan vidrieria y termopaneles por separado. Ventora les puede centralizar solicitudes y cotizaciones sin desorden.",
      fuenteUrl: "https://www.ventanas2001.cl/?utm_source=chatgpt.com",
      proximoPaso: "Enviar mensaje con foco en centralizacion comercial",
      fechaProximoContacto: "2026-05-21",
      dataStatus: "real",
      createdAt: "2026-05-21T10:03:00.000Z",
      updatedAt: "2026-05-21T10:03:00.000Z",
    },
    {
      id: "prospecto-termopaneles-chile",
      empresa: "Termopaneles Chile",
      rubro: "Aluminio y PVC termopanel",
      canal: "WhatsApp",
      contactoPublico: "WhatsApp +56 9 9006 0213 / +56 9 7698 5723",
      regionComuna: "Chile",
      score: "8/10",
      estado: "Nuevo",
      prioridad: "A2",
      porQueCalza:
        "Vende ventanas termopanel de aluminio y PVC; ya usa WhatsApp como canal comercial.",
      anguloPrimerMensaje:
        "Vi que cotizan directo por WhatsApp. Ventora puede reducir el tiempo de creacion de cotizaciones y dejar cada oportunidad con seguimiento.",
      fuenteUrl:
        "https://www.termopaneles-chile.cl/termopaneles-ventanas-aluminio-ventanas-pvc.html?utm_source=chatgpt.com",
      proximoPaso: "Enviar mensaje con foco en cotizar mas rapido",
      fechaProximoContacto: "2026-05-23",
      dataStatus: "real",
      createdAt: "2026-05-21T10:04:00.000Z",
      updatedAt: "2026-05-21T10:04:00.000Z",
    },
    {
      id: "prospecto-deco-ventanas",
      empresa: "Deco Ventanas",
      rubro: "PVC, aluminio termopanel y cierres",
      canal: "WhatsApp",
      contactoPublico: "WhatsApp desde sitio",
      regionComuna: "Region Metropolitana",
      score: "8/10",
      estado: "Nuevo",
      prioridad: "A2",
      porQueCalza:
        "Pagina enfocada en PVC, aluminio termopanel y cierres de terraza; promete cotizar en 1 minuto por WhatsApp.",
      anguloPrimerMensaje:
        "Vi que trabajan PVC, aluminio termopanel y cierres. Ventora puede reforzar esa captacion con landing propia, bandeja de solicitudes y cotizacion rapida.",
      fuenteUrl: "https://www.decoventanas.cl/?utm_source=chatgpt.com",
      proximoPaso: "Enviar mensaje con foco en captacion y velocidad",
      fechaProximoContacto: "2026-05-23",
      dataStatus: "real",
      createdAt: "2026-05-21T10:05:00.000Z",
      updatedAt: "2026-05-21T10:05:00.000Z",
    },
    {
      id: "prospecto-termopaneles-depassier",
      empresa: "Termopaneles Depassier",
      rubro: "PVC y aluminio",
      canal: "WhatsApp",
      contactoPublico: "Boton contactar por WhatsApp",
      regionComuna: "Chile",
      score: "8/10",
      estado: "Nuevo",
      prioridad: "A2",
      porQueCalza:
        "Especialistas en termopanel PVC/aluminio; web simple con CTA directo a WhatsApp.",
      anguloPrimerMensaje:
        "Vi que ya captan por WhatsApp. Ventora les puede ayudar a convertir esas conversaciones en cotizaciones ordenadas y trazables.",
      fuenteUrl: "https://www.termopanelesdepassier.cl/?utm_source=chatgpt.com",
      proximoPaso: "Enviar mensaje con foco en trazabilidad comercial",
      fechaProximoContacto: "2026-05-23",
      dataStatus: "real",
      createdAt: "2026-05-21T10:06:00.000Z",
      updatedAt: "2026-05-21T10:06:00.000Z",
    },
    {
      id: "prospecto-ventalglass",
      empresa: "Ventalglass",
      rubro: "Ventanas termopanel PVC",
      canal: "Google Maps",
      contactoPublico: "Sitio web / formulario",
      regionComuna: "Santiago / regiones",
      score: "8/10",
      estado: "Nuevo",
      prioridad: "A2",
      porQueCalza:
        "Fabrican e instalan ventanas termopanel PVC a medida para proyectos residenciales y comerciales.",
      anguloPrimerMensaje:
        "Vi que trabajan proyectos residenciales y comerciales. Ventora puede ayudarles a separar oportunidades, estados y cotizaciones por cliente.",
      fuenteUrl: "https://www.ventalglass.cl/?utm_source=chatgpt.com",
      proximoPaso: "Enviar mensaje con foco en orden por cliente/proyecto",
      fechaProximoContacto: "2026-05-23",
      dataStatus: "real",
      createdAt: "2026-05-21T10:07:00.000Z",
      updatedAt: "2026-05-21T10:07:00.000Z",
    },
    {
      id: "prospecto-termohome",
      empresa: "TermoHome",
      rubro: "PVC, aluminio y vidrio templado",
      canal: "WhatsApp",
      contactoPublico: "Instagram / Facebook / WhatsApp desde sitio",
      regionComuna: "Chile",
      score: "8/10",
      estado: "Nuevo",
      prioridad: "A2",
      porQueCalza:
        "Trabaja PVC, aluminio termopanel, vidrios templados y proyectos particulares e institucionales.",
      anguloPrimerMensaje:
        "Vi que tienen varias lineas de trabajo. Ventora puede ordenar las solicitudes por tipo de proyecto y acelerar el presupuesto desde el celular.",
      fuenteUrl: "https://www.termohome.cl/?utm_source=chatgpt.com",
      proximoPaso: "Enviar mensaje con foco en multiples lineas",
      fechaProximoContacto: "2026-05-23",
      dataStatus: "real",
      createdAt: "2026-05-21T10:08:00.000Z",
      updatedAt: "2026-05-21T10:08:00.000Z",
    },
    {
      id: "prospecto-alfalum",
      empresa: "Alfalum",
      rubro: "Ventanas, shower door y cierres",
      canal: "WhatsApp",
      contactoPublico: "Web / cotizacion",
      regionComuna: "Chile",
      score: "8/10",
      estado: "Nuevo",
      prioridad: "A2",
      porQueCalza:
        "Ofrece ventanas aluminio/PVC, shower door, cierres de terraza y cerramientos.",
      anguloPrimerMensaje:
        "Vi que cubren ventanas, shower door y cierres. Ventora puede ayudarles a gestionar cotizaciones repetitivas y hacer seguimiento comercial.",
      fuenteUrl: "https://alfalum.cl/cotizacion/?utm_source=chatgpt.com",
      proximoPaso: "Enviar mensaje con foco en cotizaciones repetitivas",
      fechaProximoContacto: "2026-05-23",
      dataStatus: "real",
      createdAt: "2026-05-21T10:09:00.000Z",
      updatedAt: "2026-05-21T10:09:00.000Z",
    },
    {
      id: "prospecto-antovalspa",
      empresa: "Antovalspa",
      rubro: "Termopanel aluminio y PVC",
      canal: "WhatsApp",
      contactoPublico: "Web / WhatsApp / telefonos / formulario",
      regionComuna: "Santiago y regiones",
      score: "7.5/10",
      estado: "Nuevo",
      prioridad: "B1",
      porQueCalza:
        "Especialistas en ventanas termopanel de aluminio y PVC; hacen fabricacion e instalacion.",
      anguloPrimerMensaje:
        "Vi que atienden por web, WhatsApp y formulario. Ventora puede concentrar esos contactos y evitar que se pierdan entre canales.",
      fuenteUrl:
        "https://www.antovalspa.cl/otras-ventanas-aluminio-pvc.html?utm_source=chatgpt.com",
      proximoPaso: "Enviar mensaje con foco en concentrar canales",
      fechaProximoContacto: "2026-05-27",
      dataStatus: "real",
      createdAt: "2026-05-21T10:10:00.000Z",
      updatedAt: "2026-05-21T10:10:00.000Z",
    },
    {
      id: "prospecto-real-windows",
      empresa: "Real Windows",
      rubro: "Ventanas y puertas PVC/aluminio",
      canal: "WhatsApp",
      contactoPublico: "Sitio web / solicitud de cotizacion",
      regionComuna: "Chile",
      score: "7.5/10",
      estado: "Nuevo",
      prioridad: "B1",
      porQueCalza:
        "Fabrican e instalan ventanas y puertas PVC/aluminio; perfil mas consolidado, posible pyme mediana.",
      anguloPrimerMensaje:
        "Vi que fabrican e instalan PVC/aluminio. Ventora puede servirles como capa comercial rapida para solicitudes, cotizaciones y aprobaciones.",
      fuenteUrl: "https://www.realwindows.cl/?utm_source=chatgpt.com",
      proximoPaso: "Enviar mensaje con foco en capa comercial rapida",
      fechaProximoContacto: "2026-05-27",
      dataStatus: "real",
      createdAt: "2026-05-21T10:11:00.000Z",
      updatedAt: "2026-05-21T10:11:00.000Z",
    },
    {
      id: "prospecto-group-glass-chile",
      empresa: "Group Glass Chile",
      rubro: "Barandas, shower door y cierres",
      canal: "Google Maps",
      contactoPublico: "Sitio web",
      regionComuna: "Chile",
      score: "7.5/10",
      estado: "Nuevo",
      prioridad: "B1",
      porQueCalza:
        "Trabaja barandas de vidrio, shower door y cierres de cristal; buen fit por variedad de productos a medida.",
      anguloPrimerMensaje:
        "Vi que manejan barandas, shower door y cierres de cristal. Ventora puede estandarizar sus presupuestos y mejorar el seguimiento de cada proyecto.",
      fuenteUrl: "https://groupglass.cl/?utm_source=chatgpt.com",
      proximoPaso: "Enviar mensaje con foco en variedad de productos",
      fechaProximoContacto: "2026-05-27",
      dataStatus: "real",
      createdAt: "2026-05-21T10:12:00.000Z",
      updatedAt: "2026-05-21T10:12:00.000Z",
    },
    {
      id: "prospecto-vidrios-atenas",
      empresa: "Vidrios Atenas",
      rubro: "Herrajes, cristales templados y shower door",
      canal: "Instagram",
      contactoPublico: "Web / Instagram",
      regionComuna: "Chile",
      score: "7/10",
      estado: "Nuevo",
      prioridad: "B2",
      porQueCalza:
        "Empresa de herrajes, cristales templados, shower door y mantencion a empresas; puede requerir orden comercial.",
      anguloPrimerMensaje:
        "Vi que trabajan shower door y mantenciones a empresas. Ventora puede ayudarles a documentar solicitudes y generar cotizaciones mas profesionales.",
      fuenteUrl: "https://vidriosatenas.cl/?utm_source=chatgpt.com",
      proximoPaso: "Enviar mensaje con foco en cotizacion profesional",
      fechaProximoContacto: "2026-05-30",
      dataStatus: "real",
      createdAt: "2026-05-21T10:13:00.000Z",
      updatedAt: "2026-05-21T10:13:00.000Z",
    },
    {
      id: "prospecto-vidrios-puyaral",
      empresa: "Vidrios Puyaral 2.0",
      rubro: "Vidrios, aluminio y termopanel",
      canal: "Instagram",
      contactoPublico: "Agenda por WhatsApp, numero no visible",
      regionComuna: "Chillan y alrededores",
      score: "8.5/10",
      estado: "Nuevo",
      prioridad: "A2",
      porQueCalza:
        "Perfil muy alineado: vidrios, aluminio, shower doors y termopaneles; foco local.",
      anguloPrimerMensaje:
        "Vi que atienden Chillan y alrededores con vidrios, aluminio y termopaneles. Ventora les puede ahorrar tiempo cotizando y ordenar las solicitudes por WhatsApp.",
      fuenteUrl:
        "https://www.instagram.com/vidriospuyaral2.0/?utm_source=chatgpt.com",
      proximoPaso: "Escribir por Instagram y pedir canal directo",
      fechaProximoContacto: "2026-05-23",
      dataStatus: "real",
      createdAt: "2026-05-21T10:14:00.000Z",
      updatedAt: "2026-05-21T10:14:00.000Z",
    },
    {
      id: "prospecto-renovatek",
      empresa: "Renovatek",
      rubro: "Ventanas, puertas PVC europeo y termopanel",
      canal: "Instagram",
      contactoPublico: "WhatsApp +56 9 7174 0194 / contacto@renovatek.cl",
      regionComuna: "Chile",
      score: "8/10",
      estado: "Nuevo",
      prioridad: "A2",
      porQueCalza:
        "Trabaja ventanas, puertas, PVC europeo y termopanel; buena presencia digital.",
      anguloPrimerMensaje:
        "Vi que promocionan ventanas y termopanel. Ventora puede ayudarles a transformar consultas de redes en cotizaciones con seguimiento.",
      fuenteUrl:
        "https://www.instagram.com/reel/C8mdyhStJfm/?utm_source=chatgpt.com",
      proximoPaso: "Enviar mensaje con foco en redes a cotizaciones",
      fechaProximoContacto: "2026-05-23",
      dataStatus: "real",
      createdAt: "2026-05-21T10:15:00.000Z",
      updatedAt: "2026-05-21T10:15:00.000Z",
    },
    {
      id: "prospecto-divialum",
      empresa: "Divialum CL",
      rubro: "Aluminio, PVC, termopanel y vidrios",
      canal: "Instagram",
      contactoPublico: "Instagram / DM",
      regionComuna: "Chile",
      score: "8/10",
      estado: "Nuevo",
      prioridad: "A2",
      porQueCalza:
        "Especialistas en fabricacion de ventanas en aluminio, PVC, termopanel, vidrios y espejos a medida.",
      anguloPrimerMensaje:
        "Vi que fabrican ventanas, termopaneles y vidrios a medida. Ventora puede acelerar el proceso de levantar medidas, cotizar y cerrar por WhatsApp.",
      fuenteUrl:
        "https://www.instagram.com/reel/DNHPJ2quLpp/?utm_source=chatgpt.com",
      proximoPaso: "Enviar DM con foco en velocidad de cierre",
      fechaProximoContacto: "2026-05-23",
      dataStatus: "real",
      createdAt: "2026-05-21T10:16:00.000Z",
      updatedAt: "2026-05-21T10:16:00.000Z",
    },
    {
      id: "prospecto-cristalyalum",
      empresa: "Cristalyalum",
      rubro: "Ventanales aluminio y termopanel",
      canal: "Instagram",
      contactoPublico: "Instagram / DM",
      regionComuna: "Chile",
      score: "7.5/10",
      estado: "Nuevo",
      prioridad: "B1",
      porQueCalza:
        "Publica ventanales de aluminio con termopanel y fabricacion a medida.",
      anguloPrimerMensaje:
        "Vi sus trabajos de ventanales de aluminio y termopanel. Ventora puede ayudarles a no perder clientes que llegan por Instagram o WhatsApp.",
      fuenteUrl:
        "https://www.instagram.com/reel/DVyQu9_D8l4/?utm_source=chatgpt.com",
      proximoPaso: "Enviar DM con foco en no perder consultas",
      fechaProximoContacto: "2026-05-27",
      dataStatus: "real",
      createdAt: "2026-05-21T10:17:00.000Z",
      updatedAt: "2026-05-21T10:17:00.000Z",
    },
    {
      id: "prospecto-vidrieria-plaza",
      empresa: "Vidrieria Plaza",
      rubro: "Ventanas aluminio y termopanel",
      canal: "Instagram",
      contactoPublico: "Instagram / DM",
      regionComuna: "Chile",
      score: "7.5/10",
      estado: "Nuevo",
      prioridad: "B1",
      porQueCalza:
        "Se posiciona como especialista local en ventanas de aluminio, proyectantes y termopaneles.",
      anguloPrimerMensaje:
        "Vi que trabajan ventanas de aluminio y termopaneles. Ventora les puede dar una pagina propia para captar solicitudes y cotizar mas rapido.",
      fuenteUrl:
        "https://www.instagram.com/p/DYVKmXaoCEq/?utm_source=chatgpt.com",
      proximoPaso: "Enviar DM con foco en pagina propia de captacion",
      fechaProximoContacto: "2026-05-27",
      dataStatus: "real",
      createdAt: "2026-05-21T10:18:00.000Z",
      updatedAt: "2026-05-21T10:18:00.000Z",
    },
    {
      id: "prospecto-multiventanas",
      empresa: "Multiventanas",
      rubro: "Ventanas",
      canal: "Instagram",
      contactoPublico: "WhatsApp +56 9 6471 5437 / multiventanas.cl",
      regionComuna: "V Region, Coquimbo, La Serena",
      score: "8.5/10",
      estado: "Nuevo",
      prioridad: "A2",
      porQueCalza:
        "Senal clara de expansion regional; trabaja ventanas y capta por WhatsApp.",
      anguloPrimerMensaje:
        "Vi que estan creciendo hacia Coquimbo y La Serena. Ventora puede ayudarles a ordenar nuevos prospectos por zona y hacer seguimiento comercial.",
      fuenteUrl:
        "https://www.instagram.com/p/DNOcxCUS1wr/?utm_source=chatgpt.com",
      proximoPaso: "Enviar mensaje con foco en expansion regional",
      fechaProximoContacto: "2026-05-23",
      dataStatus: "real",
      createdAt: "2026-05-21T10:19:00.000Z",
      updatedAt: "2026-05-21T10:19:00.000Z",
    },
  ],
  experiments: [],
  updatedAt: "2026-05-21T10:20:00.000Z",
};

function cloneWorkspace(workspace: GrowthWorkspace) {
  return JSON.parse(JSON.stringify(workspace)) as GrowthWorkspace;
}

function canUseStorage() {
  return typeof window !== "undefined";
}

export const growthDashboardRepository = {
  async getWorkspace() {
    if (!canUseStorage()) {
      return cloneWorkspace(DEFAULT_WORKSPACE);
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        const seed = cloneWorkspace(DEFAULT_WORKSPACE);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
        return seed;
      }

      return JSON.parse(raw) as GrowthWorkspace;
    } catch {
      return cloneWorkspace(DEFAULT_WORKSPACE);
    }
  },
  async saveWorkspace(workspace: GrowthWorkspace) {
    const nextWorkspace = cloneWorkspace(workspace);

    if (!canUseStorage()) {
      return nextWorkspace;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextWorkspace));
    return nextWorkspace;
  },
  async resetWorkspace() {
    const nextWorkspace = cloneWorkspace(DEFAULT_WORKSPACE);

    if (canUseStorage()) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextWorkspace));
    }

    return nextWorkspace;
  },
};
