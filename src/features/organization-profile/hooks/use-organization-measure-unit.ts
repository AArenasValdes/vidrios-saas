"use client";

import { useOrganizationProfile } from "@/features/organization-profile/hooks/useOrganizationProfile";
import { normalizeMeasureUnit } from "@/features/organization-profile/services/measure-unit.service";
import type { MeasureUnit } from "@/features/organization-profile/types/measure-unit";

export function useOrganizationMeasureUnit(): MeasureUnit {
  const { profile } = useOrganizationProfile();
  return normalizeMeasureUnit(profile?.unidadMedidas);
}
