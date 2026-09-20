import {
  buildPublicRequestShareClipboardText,
  buildPublicRequestSharePayload,
  type PublicRequestShareChannel,
} from "@/features/solicitudes/services/public-request-share.service";

export type SharePublicPageInput = {
  url: string;
  empresaNombre?: string | null;
  channel?: PublicRequestShareChannel;
  variantId?: string;
};

export type SharePublicPageResult = "shared" | "copied" | "cancelled" | "failed";

function isShareAbortError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const name = "name" in error ? String(error.name) : "";
  return name === "AbortError";
}

export function canUseWebShare() {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export async function sharePublicPage(
  input: SharePublicPageInput
): Promise<SharePublicPageResult> {
  if (!input.url.trim()) {
    return "failed";
  }

  if (canUseWebShare()) {
    try {
      await navigator.share(buildPublicRequestSharePayload(input));
      return "shared";
    } catch (error) {
      if (isShareAbortError(error)) {
        return "cancelled";
      }
    }
  }

  try {
    await navigator.clipboard.writeText(buildPublicRequestShareClipboardText(input));
    return "copied";
  } catch {
    return "failed";
  }
}
