"use client";

export async function loadVentoraPdfLogoDataUrl(): Promise<string | null> {
  try {
    const image = new window.Image();
    image.src = "/brand/ventora-logo-compact-on-light.svg";
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 1000;
    canvas.height = 212;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}
