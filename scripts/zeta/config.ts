/** URL base de Sistema Zeta (login / app). Override con `ZETA_BASE_URL`. */
export function zetaBaseUrl(): string {
  return process.env.ZETA_BASE_URL ?? "https://sistemazeta.cl/zeta/";
}

function normalizedBase(): string {
  return zetaBaseUrl().replace(/\/$/, "");
}

/** Rutas candidatas para listado de proyectos, sin duplicar `/zeta/`. */
export function zetaProjectUrls(): string[] {
  const base = normalizedBase();
  if (base.endsWith("/zeta")) {
    return [`${base}/proyectos`, `${base}/projects`];
  }
  return [`${base}/zeta/proyectos`, `${base}/zeta/projects`, `${base}/proyectos`];
}

export function zetaPrimaryProjectUrl(): string {
  return zetaProjectUrls()[0] ?? `${normalizedBase()}/proyectos`;
}
