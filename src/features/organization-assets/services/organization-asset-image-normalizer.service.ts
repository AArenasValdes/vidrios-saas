import sharp from "sharp";

import {
  ORGANIZATION_ASSET_LOGO_MAX_EDGE,
  ORGANIZATION_ASSET_MAX_INPUT_PIXELS,
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

const SAFE_RASTER_INPUT_FORMATS = new Set([
  "avif",
  "heif",
  "jpeg",
  "png",
  "webp",
]);

export class OrganizationAssetImageProcessingError extends Error {
  constructor(message = "No pudimos procesar esta imagen.") {
    super(message);
    this.name = "OrganizationAssetImageProcessingError";
  }
}

export async function normalizeOrganizationAssetImage(
  kind: OrganizationAssetUploadKind,
  file: File
): Promise<NormalizedOrganizationAsset> {
  const inputBuffer = Buffer.from(await file.arrayBuffer());

  try {
    const image = sharp(inputBuffer, {
      failOn: "warning",
      limitInputPixels: ORGANIZATION_ASSET_MAX_INPUT_PIXELS,
      animated: false,
    });
    const metadata = await image.metadata();

    if (!metadata.format || !SAFE_RASTER_INPUT_FORMATS.has(metadata.format)) {
      throw new OrganizationAssetImageProcessingError();
    }

    if (kind === "logo") {
      const outputBuffer = await image
        .rotate()
        .resize({
          width: ORGANIZATION_ASSET_LOGO_MAX_EDGE,
          height: ORGANIZATION_ASSET_LOGO_MAX_EDGE,
          fit: "inside",
          withoutEnlargement: true,
        })
        .png({ compressionLevel: 9, adaptiveFiltering: true })
        .toBuffer();

      return {
        body: outputBuffer,
        contentType: "image/png",
        extension: "png",
        normalized: true,
      };
    }

    const outputBuffer = await image
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
