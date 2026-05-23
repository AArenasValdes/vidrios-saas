import sharp from "sharp";

import {
  ORGANIZATION_ASSET_WEB_IMAGE_JPEG_QUALITY,
  ORGANIZATION_ASSET_WEB_IMAGE_MAX_EDGE,
} from "@/features/organization-assets/constants/upload-constraints";

export type OrganizationAssetUploadKind = "logo" | "hero" | "gallery";

export type NormalizedOrganizationAsset = {
  body: Buffer;
  contentType: string;
  extension: string;
  normalized: boolean;
};

const MIME_EXTENSION_MAP: Record<string, string> = {
  "image/avif": "avif",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export class OrganizationAssetImageProcessingError extends Error {
  constructor(message = "No pudimos procesar esta imagen.") {
    super(message);
    this.name = "OrganizationAssetImageProcessingError";
  }
}

function resolveOriginalExtension(file: File) {
  const fromName = file.name.split(".").pop()?.trim().toLowerCase();

  if (fromName) {
    return fromName;
  }

  return MIME_EXTENSION_MAP[file.type.toLowerCase()] ?? "jpg";
}

function shouldNormalizeToJpeg(kind: OrganizationAssetUploadKind) {
  return kind === "hero" || kind === "gallery";
}

export async function normalizeOrganizationAssetImage(
  kind: OrganizationAssetUploadKind,
  file: File
): Promise<NormalizedOrganizationAsset> {
  const inputBuffer = Buffer.from(await file.arrayBuffer());

  if (!shouldNormalizeToJpeg(kind)) {
    return {
      body: inputBuffer,
      contentType: file.type || "application/octet-stream",
      extension: resolveOriginalExtension(file),
      normalized: false,
    };
  }

  try {
    const outputBuffer = await sharp(inputBuffer, {
      failOn: "warning",
    })
      .rotate()
      .resize({
        width: ORGANIZATION_ASSET_WEB_IMAGE_MAX_EDGE,
        height: ORGANIZATION_ASSET_WEB_IMAGE_MAX_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .flatten({ background: "#ffffff" })
      .jpeg({
        quality: ORGANIZATION_ASSET_WEB_IMAGE_JPEG_QUALITY,
        mozjpeg: true,
      })
      .toBuffer();

    return {
      body: outputBuffer,
      contentType: "image/jpeg",
      extension: "jpg",
      normalized: true,
    };
  } catch {
    throw new OrganizationAssetImageProcessingError(
      "No pudimos procesar esta foto. Prueba con otra imagen o vuelve a exportarla desde tu celular."
    );
  }
}
