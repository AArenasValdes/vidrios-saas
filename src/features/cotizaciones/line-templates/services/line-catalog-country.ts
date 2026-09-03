export const CHILE_DEFAULT_LINE_CATALOG_COUNTRY_CODE = "CL" as const;

export type SeedDefaultLineCatalogStatus =
  | "completed"
  | "blocked_missing_country"
  | "blocked_non_chile";

export type SeedDefaultLineCatalogResult = {
  seeded: number;
  skipped: number;
  status: SeedDefaultLineCatalogStatus;
};

export type DefaultLineCatalogSeedDecision = {
  shouldSeed: boolean;
  status: Exclude<SeedDefaultLineCatalogStatus, "completed"> | null;
  normalizedCountryCode: string | null;
};

export function normalizeOrganizationCountryCode(
  countryCode: string | null | undefined
): string | null {
  const normalized = countryCode?.trim().toUpperCase();
  return normalized || null;
}

export function isChileOrganizationCountry(
  countryCode: string | null | undefined
): boolean {
  return (
    normalizeOrganizationCountryCode(countryCode) ===
    CHILE_DEFAULT_LINE_CATALOG_COUNTRY_CODE
  );
}

export function resolveDefaultLineCatalogSeedDecision(
  countryCode: string | null | undefined
): DefaultLineCatalogSeedDecision {
  const normalizedCountryCode = normalizeOrganizationCountryCode(countryCode);

  if (!normalizedCountryCode) {
    return {
      shouldSeed: false,
      status: "blocked_missing_country",
      normalizedCountryCode: null,
    };
  }

  if (normalizedCountryCode !== CHILE_DEFAULT_LINE_CATALOG_COUNTRY_CODE) {
    return {
      shouldSeed: false,
      status: "blocked_non_chile",
      normalizedCountryCode,
    };
  }

  return {
    shouldSeed: true,
    status: null,
    normalizedCountryCode,
  };
}

export type NonChileVentoraCatalogAuditRow = {
  organizationId: string | number;
  countryCode: string | null;
  ventoraLineCount: number;
};

export type NonChileVentoraCatalogAuditResult = {
  organizationCount: number;
  totalVentoraLines: number;
  rows: NonChileVentoraCatalogAuditRow[];
};

/**
 * Cuenta organizaciones no chilenas que ya tienen líneas con catalog_key ventora:*.
 * Solo diagnóstico: no modifica datos.
 */
export async function auditNonChileOrganizationsWithVentoraCatalog(deps: {
  listOrganizationCountries: () => Promise<
    Array<{ organizationId: string | number; countryCode: string | null }>
  >;
  countVentoraCatalogLines: (
    organizationId: string | number
  ) => Promise<number>;
}): Promise<NonChileVentoraCatalogAuditResult> {
  const organizations = await deps.listOrganizationCountries();
  const rows: NonChileVentoraCatalogAuditRow[] = [];

  for (const organization of organizations) {
    if (isChileOrganizationCountry(organization.countryCode)) {
      continue;
    }

    const ventoraLineCount = await deps.countVentoraCatalogLines(
      organization.organizationId
    );

    if (ventoraLineCount <= 0) {
      continue;
    }

    rows.push({
      organizationId: organization.organizationId,
      countryCode: normalizeOrganizationCountryCode(organization.countryCode),
      ventoraLineCount,
    });
  }

  return {
    organizationCount: rows.length,
    totalVentoraLines: rows.reduce((sum, row) => sum + row.ventoraLineCount, 0),
    rows,
  };
}
