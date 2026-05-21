export type GoogleTagDataStatus = "disabled" | "ready";

export type GoogleTagEventParams = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (
      command: "js" | "config" | "set" | "event" | "consent",
      targetOrDate: string | Date,
      params?: GoogleTagEventParams
    ) => void;
    __ventoraTrackedPaths?: Record<string, boolean>;
    __ventoraTrackedConversions?: Record<string, boolean>;
  }
}

export {};
