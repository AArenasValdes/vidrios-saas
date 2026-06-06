export type ComponentCategoryTitle =
  | "Aberturas"
  | "Cierres y exteriores"
  | "Interiores y decoracion"
  | "Especiales"
  | "Proyecto libre y Mantencion";

export type ComponentCatalogItem = {
  tipo: string;
  sistemas: readonly string[];
  configuraciones?: readonly string[];
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
        sistemas: ["Corredera", "Proyectante", "Abatible", "Oscilobatiente"],
      },
      {
        tipo: "Puerta",
        descripcion: "Puertas vidriadas de uso comun.",
        sistemas: ["Corredera", "Abatible", "Pivotante"],
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
        sistemas: ["Corredera", "Batiente"],
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
    title: "Interiores y decoracion",
    items: [
      {
        tipo: "Espejo",
        descripcion: "Espejos para muro, marco o instalacion.",
        sistemas: ["Muro", "Pegado", "Con instalacion", "Con marco"],
        configuraciones: ["Pulido", "Biselado", "Recto"],
      },
      {
        tipo: "Tapa de mesa",
        descripcion: "Cubiertas de vidrio para mesa.",
        sistemas: ["Recta", "Forma especial"],
        configuraciones: ["Canto pulido", "Biselado"],
      },
    ],
  },
  {
    title: "Especiales",
    items: [
      {
        tipo: "Trabajo personalizado",
        descripcion: "Trabajo libre para alcances especiales o fabricacion a medida.",
        sistemas: ["A medida", "Manual", "Por definir"],
        configuraciones: ["Libre", "Por definir"],
        esItemLibre: true,
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
  [normalizeCatalogText("Pa\u00c3\u00b1o Fijo")]: normalizeCatalogText("Paño fijo"),
  [normalizeCatalogText("Fijo")]: normalizeCatalogText("Paño fijo"),
  [normalizeCatalogText("Ventana 1 hoja")]: normalizeCatalogText("Paño fijo"),
  [normalizeCatalogText("Ventana fija")]: normalizeCatalogText("Paño fijo"),
  "cierre logia balcon": "cierre terraza logia",
  "cierre terraza logia balcon": "cierre terraza logia",
  "componente manual": "trabajo personalizado",
  "proyecto a medida": "trabajo personalizado",
  "otro trabajo especial": "trabajo personalizado",
  otro: "trabajo personalizado",
  // Legacy: old "Proyecto libre y Mantencion" subtypes → canonical single type
  [normalizeCatalogText("Item libre con valor")]: normalizeCatalogText("Trabajo libre / Mantencion"),
  [normalizeCatalogText("Cambio de vidrio")]: normalizeCatalogText("Trabajo libre / Mantencion"),
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

export function getDefaultConfigurationForComponent(tipo: string) {
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

export function splitComponentReference(referencia: string | null | undefined, tipo: string) {
  const cleanReference = referencia?.trim() ?? "";
  const systems = getSystemOptionsForComponent(tipo);
  const configurations = getConfigurationOptionsForComponent(tipo);

  if (!cleanReference) {
    return {
      sistema: getDefaultSystemForComponent(tipo),
      configuracion: getDefaultConfigurationForComponent(tipo),
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
