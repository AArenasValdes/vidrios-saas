import type { OrganizationRegionSettings } from "@/features/organization-region/types/organization-region";

export type QuoteRegionSnapshot = OrganizationRegionSettings & {
  version: 1;
  capturedAt: string;
};
