export type ComponentCategoryTitle =
  | "Aberturas"
  | "Cierres y exteriores"
  | "Vidrios y cristales"
  | "Interiores y decoracion"
  | "Especiales"
  | "Proyecto libre y Mantencion";

export type ComponentCatalogItem = {
  tipo: string;
  sistemas: readonly string[];
  configuraciones?: readonly string[];
  configuracionesPorSistema?: Record<string, readonly string[]>;
  descripcion: string;
  esItemLibre?: boolean;
};

export type ComponentLeafCount = 1 | 2;

export type ComponentCatalogGroup = {
  title: ComponentCategoryTitle;
  items: readonly string[];
};

export const COMPONENT_CATALOG = [
  {
    title: "Aberturas",
    items: [
      {
        tipo: "Ventana",
        descripcion: "Ventanas de aluminio o PVC.",
        sistemas: [
          "Corredera",
          "Proyectante",
          "Abatible",
          "Oscilobatiente",
          "Bow Window",
          "Guillotina",
          "Celosía",
          "Personalizado",
        ],
        configuracionesPorSistema: {
          "Bow Window": [
            "Corredera",
            "Proyectante",
            "Batiente / abatible",
            "Fija",
            "Mixta",
          ],
        },
      },
      {
        tipo: "Puerta",
        descripcion: "Puertas de aluminio o PVC con multiples sistemas y configuraciones.",
        sistemas: [
          "Corredera",
          "Abatible",
          "Pivotante",
          "Plegable",
          "Vaiven",
          "Vidrio templado",
          "Colgante",
          "Automatica",
          "Otro",
        ],
        configuracionesPorSistema: {
          Corredera: [
            "1 fija + 1 movil",
            "2 moviles",
            "3 hojas",
            "4 hojas / 2 fijas + 2 moviles",
            "4 hojas moviles",
            "Doble riel",
            "Triple riel",
            "Personalizado",
          ],
          Abatible: [
            "1 hoja",
            "2 hojas / puerta doble",
            "2 hojas + fijo superior",
            "1 hoja + fijo lateral",
            "2 hojas + fijo lateral",
            "2 hojas + 2 fijos laterales",
            "4 hojas abatibles",
            "Con fijo superior",
            "Con fijo lateral + fijo superior",
            "Apertura interior",
            "Apertura exterior",
            "Personalizado",
          ],
          Pivotante: [
            "1 hoja pivotante",
            "Pivotante + fijo lateral",
            "Pivotante doble",
            "Personalizado",
          ],
          Plegable: [
            "2 hojas plegables",
            "3 hojas plegables",
            "4 hojas plegables",
            "4 hojas / 2 + 2",
            "Acordeon",
            "Personalizado",
          ],
          Vaiven: [
            "1 hoja vaiven",
            "2 hojas vaiven",
            "Vidrio templado vaiven",
            "Personalizado",
          ],
          "Vidrio templado": [
            "1 hoja vidrio templado",
            "Doble hoja vidrio templado",
            "4 hojas vidrio templado",
            "Corredera vidrio templado",
            "Vaiven vidrio templado",
            "Con quicio / pivote",
            "Personalizado",
          ],
          Colgante: [
            "1 hoja colgante",
            "2 hojas colgantes",
            "Colgante + fijo lateral",
            "Personalizado",
          ],
          Automatica: [
            "1 hoja automatica",
            "2 hojas automaticas",
            "Automatica + fijo lateral",
            "Personalizado",
          ],
          Otro: [
            "Personalizado",
          ],
        },
      },
      {
        tipo: "Paño fijo",
        descripcion: "Vidrio fijo sin apertura.",
        sistemas: ["Fijo"],
        configuraciones: ["Con perfileria", "Sin perfileria", "Premium"],
      },
      {
        tipo: "Shower door",
        descripcion: "Mamparas y shower door.",
        sistemas: ["Corredera", "Batiente", "Fijo / Walk-in"],
        configuraciones: ["Frontal", "Esquinero", "En L"],
      },
    ],
  },
  {
    title: "Cierres y exteriores",
    items: [
      {
        tipo: "Cierre terraza/logia",
        descripcion: "Cierres para terraza, logia o balcon.",
        sistemas: ["Corredera", "Plegable", "Fijo", "Mixto"],
      },
      {
        tipo: "Baranda",
        descripcion: "Barandas de vidrio.",
        sistemas: ["Botones", "Perfil inferior", "Postes"],
      },
    ],
  },
  {
    title: "Vidrios y cristales",
    items: [
      {
        tipo: "Vidrio / Cristal",
        descripcion: "Vidrios, cristales, termopaneles o reposiciones sin perfileria.",
        sistemas: ["Sin perfileria"],
        configuraciones: [
          "Vidrio suelto",
          "Reposicion",
          "Termopanel",
          "Espejo",
          "Personalizado",
        ],
      },
    ],
  },
  {
    title: "Interiores y decoracion",
    items: [
      {
        tipo: "Espejo",
        descripcion: "Espejos para muro, marco o instalacion.",
        sistemas: ["Muro", "Pegado", "Con instalacion"],
        configuraciones: ["Pulido", "Biselado", "Recto"],
      },
      {
        tipo: "Cubierta de mesa",
        descripcion: "Cubiertas de vidrio para mesa.",
        sistemas: ["Recta", "Forma especial", "Circular"],
        configuraciones: ["Canto pulido", "Biselado"],
      },
    ],
  },
  {
    title: "Especiales",
    items: [
      {
        tipo: "Trabajo personalizado",
        descripcion:
          "Fabricacion a medida: arma la composición en el constructor o descríbela.",
        sistemas: ["A medida", "Manual", "Por definir"],
        configuraciones: ["Libre", "Por definir"],
      },
      {
        tipo: "Fachada vidriada",
        descripcion: "Fachadas o frentes vidriados.",
        sistemas: ["Fijo", "Modular"],
        configuraciones: ["Con perfileria", "Premium"],
      },
      {
        tipo: "Vitrina",
        descripcion: "Vitrinas comerciales o exhibidores.",
        sistemas: ["Fijo", "Corredera"],
        configuraciones: ["Con perfileria", "Templada"],
      },
      {
        tipo: "Muro cortina",
        descripcion: "Sistema vidriado de fachada.",
        sistemas: ["Modular", "Stick"],
        configuraciones: ["Con perfileria"],
      },
      {
        tipo: "Lucarna o techo vidriado",
        descripcion: "Cubiertas, lucarnas y techos vidriados.",
        sistemas: ["Fijo", "Proyectante"],
        configuraciones: ["Con perfileria", "Especial"],
      },
    ],
  },
  {
    title: "Proyecto libre y Mantencion",
    items: [
      {
        tipo: "Trabajo libre / Mantencion",
        descripcion: "Usalo para reparaciones, cambios de vidrio, mantenciones, sellados o trabajos personalizados.",
        sistemas: ["Unidad"],
        configuraciones: [],
        esItemLibre: true,
      },
    ],
  },
] as const;

export const COMPONENT_TYPE_GROUPS = COMPONENT_CATALOG.map((group) => ({
  title: group.title,
  items: group.items.map((item) => item.tipo),
})) as readonly ComponentCatalogGroup[];

function normalizeCatalogText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const LEGACY_COMPONENT_ALIASES: Record<string, string> = {
  [normalizeCatalogText("Paño Fijo")]: normalizeCatalogText("Paño fijo"),
  [normalizeCatalogText("Fijo")]: normalizeCatalogText("Paño fijo"),
  [normalizeCatalogText("Ventana 1 hoja")]: normalizeCatalogText("Paño fijo"),
  [normalizeCatalogText("Ventana fija")]: normalizeCatalogText("Paño fijo"),
  "cierre logia balcon": "cierre terraza logia",
  "cierre terraza logia balcon": "cierre terraza logia",
  "componente manual": "trabajo personalizado",
  "proyecto a medida": "trabajo personalizado",
  "otro trabajo especial": "trabajo personalizado",
  otro: "trabajo personalizado",
  "tapa de mesa": "cubierta de mesa",
  vidrio: "vidrio cristal",
  cristal: "vidrio cristal",
  "vidrio cristal": "vidrio cristal",
  "cristal vidrio": "vidrio cristal",
  "vidrio suelto": "vidrio cristal",
  "cristal suelto": "vidrio cristal",
  "cambio de vidrio": "vidrio cristal",
  // Legacy: old "Proyecto libre y Mantencion" subtypes â†’ canonical single type
  [normalizeCatalogText("Item libre con valor")]: normalizeCatalogText("Trabajo libre / Mantencion"),
  [normalizeCatalogText("Cambio de vidrio")]: normalizeCatalogText("Vidrio / Cristal"),
  [normalizeCatalogText("Mantencion de ventanas")]: normalizeCatalogText("Trabajo libre / Mantencion"),
  [normalizeCatalogText("Cambio de rodamientos / carros")]: normalizeCatalogText("Trabajo libre / Mantencion"),
  [normalizeCatalogText("Cambio de pestillos / cierres")]: normalizeCatalogText("Trabajo libre / Mantencion"),
  [normalizeCatalogText("Sellado o filtracion")]: normalizeCatalogText("Trabajo libre / Mantencion"),
  [normalizeCatalogText("Reparacion de shower / mampara")]: normalizeCatalogText("Trabajo libre / Mantencion"),
};

function normalizeComponentKey(value: string) {
  const normalized = normalizeCatalogText(value);

  return LEGACY_COMPONENT_ALIASES[normalized] ?? normalized;
}

function findCatalogItem(tipo: string): ComponentCatalogItem | null {
  const normalizedTipo = normalizeComponentKey(tipo);

  for (const group of COMPONENT_CATALOG) {
    const item = group.items.find(
      (candidate) => normalizeComponentKey(candidate.tipo) === normalizedTipo
    );

    if (item) {
      return item;
    }
  }

  return null;
}

export function resolveCanonicalComponentType(tipo: string) {
  return findCatalogItem(tipo)?.tipo ?? tipo;
}

export function getComponentItemsForCategory(categoria: ComponentCategoryTitle) {
  return (
    COMPONENT_CATALOG.find((group) => group.title === categoria)?.items ??
    COMPONENT_CATALOG[0].items
  );
}

export function getComponentTypeOptionsForCategory(categoria: ComponentCategoryTitle) {
  return getComponentItemsForCategory(categoria).map((item) => item.tipo);
}

export function resolveComponentCategory(tipo: string): ComponentCategoryTitle {
  const normalizedTipo = normalizeComponentKey(tipo);

  return (
    COMPONENT_CATALOG.find((group) =>
      group.items.some((item) => normalizeComponentKey(item.tipo) === normalizedTipo)
    )?.title ?? COMPONENT_CATALOG[0].title
  );
}

export function getSystemOptionsForComponent(tipo: string) {
  return findCatalogItem(tipo)?.sistemas ?? ["A medida"];
}

export function getConfigurationOptionsForComponent(tipo: string) {
  return findCatalogItem(tipo)?.configuraciones ?? [];
}

export function getDefaultSystemForComponent(tipo: string) {
  return getSystemOptionsForComponent(tipo)[0] ?? "";
}

export function getDefaultConfigurationForComponent(tipo: string, sistema?: string) {
  const resolvedSistema = sistema?.trim() || getDefaultSystemForComponent(tipo);

  if (hasPerSystemConfigurations(tipo)) {
    return getConfigurationOptionsForComponentSistema(tipo, resolvedSistema)[0] ?? "";
  }

  return getConfigurationOptionsForComponent(tipo)[0] ?? "";
}

export function getBaseLeafCountForComponent(tipo: string): ComponentLeafCount | null {
  const normalizedTipo = normalizeComponentKey(tipo);
  const rawNormalizedTipo = normalizeCatalogText(tipo);

  if (normalizedTipo === normalizeComponentKey("Ventana")) {
    return 2;
  }

  if (
    normalizedTipo === normalizeComponentKey("Paño fijo") ||
    rawNormalizedTipo === normalizeCatalogText("Ventana 1 hoja") ||
    rawNormalizedTipo === normalizeCatalogText("Ventana fija")
  ) {
    return 1;
  }

  return null;
}

export function composeComponentReference(sistema: string, configuracion: string) {
  const cleanSystem = sistema.trim();
  const cleanConfiguration = configuracion.trim();

  if (!cleanSystem) {
    return cleanConfiguration;
  }

  if (!cleanConfiguration) {
    return cleanSystem;
  }

  return `${cleanSystem} - ${cleanConfiguration}`;
}

export function splitComponentReference(referencia: string | null | undefined, tipo: string, sistema?: string) {
  const cleanReference = referencia?.trim() ?? "";
  const systems = getSystemOptionsForComponent(tipo);
  const resolvedSistema = sistema?.trim() || getDefaultSystemForComponent(tipo);
  const configurations = hasPerSystemConfigurations(tipo)
    ? getConfigurationOptionsForComponentSistema(tipo, resolvedSistema)
    : getConfigurationOptionsForComponent(tipo);

  if (!cleanReference) {
    return {
      sistema: resolvedSistema,
      configuracion: getConfigurationOptionsForComponentSistema(tipo, resolvedSistema)[0] ?? "",
    };
  }

  const [rawSystem, rawConfiguration] = cleanReference.split(/\s+-\s+/, 2);
  const normalizedReference = normalizeCatalogText(cleanReference);
  const matchedSystem =
    systems.find((system) => normalizeCatalogText(system) === normalizeCatalogText(rawSystem)) ??
    systems.find((system) => normalizedReference.includes(normalizeCatalogText(system))) ??
    getDefaultSystemForComponent(tipo);
  const matchedConfiguration =
    configurations.find(
      (configuration) =>
        normalizeCatalogText(configuration) === normalizeCatalogText(rawConfiguration ?? "")
    ) ??
    configurations.find((configuration) =>
      normalizedReference.includes(normalizeCatalogText(configuration))
    ) ??
    "";

  return {
    sistema: matchedSystem,
    configuracion: matchedConfiguration,
  };
}

export function isFreeValueComponentType(tipo: string): boolean {
  return findCatalogItem(tipo)?.esItemLibre === true;
}

export function getComponentDescripcion(tipo: string): string {
  return findCatalogItem(tipo)?.descripcion ?? "";
}

export function getConfigurationOptionsForComponentSistema(tipo: string, sistema: string): readonly string[] {
  const item = findCatalogItem(tipo);

  if (!item) {
    return [];
  }

  if (item.configuracionesPorSistema) {
    const sistemaConfigs = item.configuracionesPorSistema[sistema];
    if (sistemaConfigs && sistemaConfigs.length > 0) {
      return sistemaConfigs;
    }
  }

  return item.configuraciones ?? [];
}

export function getPrimarySystemOptionsForComponent(tipo: string): readonly string[] {
  const allSystems = getSystemOptionsForComponent(tipo);

  if (allSystems.length <= 3) {
    return allSystems;
  }

  return allSystems.slice(0, 3);
}

export function getExtendedSystemOptionsForComponent(tipo: string): readonly string[] {
  const allSystems = getSystemOptionsForComponent(tipo);

  if (allSystems.length <= 3) {
    return [];
  }

  return allSystems.slice(3);
}

export function getSystemDisplayLabel(sistema: string): string {
  const labels: Record<string, string> = {
    Personalizado: "Personalizado",
    Abatible: "Abatir",
    "Bow Window": "Bow window",
    Vaiven: "Vaivén",
    Automatica: "Automática",
  };

  return labels[sistema] ?? sistema;
}

export function getPalilloTypeDisplayLabel(palilloType: string): string {
  const labels: Record<string, string> = {
    "Cuadricula / colonial": "Cuadrícula / colonial",
  };

  return labels[palilloType] ?? palilloType;
}

export function hasPerSystemConfigurations(tipo: string): boolean {
  const item = findCatalogItem(tipo);

  if (!item) {
    return false;
  }

  return Boolean(
    item.configuracionesPorSistema &&
    Object.keys(item.configuracionesPorSistema).length > 0
  );
}

export const PALILLO_OPTIONS = ["Sin palillo", "Con palillo"] as const;

export const PALILLO_TYPE_OPTIONS = [
  "1 vertical",
  "1 horizontal",
  "Cruzado",
  "Cuadricula / colonial",
  "Personalizado",
] as const;
