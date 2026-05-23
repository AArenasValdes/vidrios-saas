import sharp from "sharp";

import {
  normalizeOrganizationAssetImage,
  OrganizationAssetImageProcessingError,
} from "../organization-asset-image-normalizer.service";

async function createPngFile(options?: { width?: number; height?: number }) {
  const width = options?.width ?? 3200;
  const height = options?.height ?? 1800;
  const buffer = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: {
        r: 20,
        g: 40,
        b: 60,
        alpha: 0.65,
      },
    },
  })
    .png()
    .toBuffer();

  return new File([buffer], "trabajo.png", {
    type: "image/png",
  });
}

describe("organization-asset-image-normalizer.service", () => {
  it("convierte gallery a jpeg web-safe y limita el borde maximo", async () => {
    const file = await createPngFile();

    const result = await normalizeOrganizationAssetImage("gallery", file);
    const metadata = await sharp(result.body).metadata();

    expect(result.contentType).toBe("image/jpeg");
    expect(result.extension).toBe("jpg");
    expect(result.normalized).toBe(true);
    expect(metadata.format).toBe("jpeg");
    expect(Math.max(metadata.width ?? 0, metadata.height ?? 0)).toBeLessThanOrEqual(
      2400
    );
  });

  it("convierte hero a jpeg aunque el origen sea png", async () => {
    const file = await createPngFile({ width: 1800, height: 900 });

    const result = await normalizeOrganizationAssetImage("hero", file);
    const metadata = await sharp(result.body).metadata();

    expect(result.contentType).toBe("image/jpeg");
    expect(result.extension).toBe("jpg");
    expect(metadata.format).toBe("jpeg");
  });

  it("mantiene logo sin conversion", async () => {
    const file = await createPngFile({ width: 600, height: 600 });
    const originalBuffer = Buffer.from(await file.arrayBuffer());

    const result = await normalizeOrganizationAssetImage("logo", file);

    expect(result.contentType).toBe("image/png");
    expect(result.extension).toBe("png");
    expect(result.normalized).toBe(false);
    expect(result.body.equals(originalBuffer)).toBe(true);
  });

  it("devuelve error preciso si la imagen no se puede decodificar", async () => {
    const file = new File([Buffer.from("not-a-real-image")], "rara.heic", {
      type: "image/heic",
    });

    await expect(
      normalizeOrganizationAssetImage("gallery", file)
    ).rejects.toThrow(OrganizationAssetImageProcessingError);
    await expect(
      normalizeOrganizationAssetImage("gallery", file)
    ).rejects.toThrow(
      "No pudimos procesar esta foto. Prueba con otra imagen o vuelve a exportarla desde tu celular."
    );
  });
});
