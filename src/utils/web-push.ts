function sanitizeWebPushKey(value: string) {
  return value.trim().replace(/^['"]|['"]$/g, "").replace(/\s+/g, "");
}

export function base64UrlToUint8Array(value: string) {
  const sanitized = sanitizeWebPushKey(value);

  if (!sanitized) {
    throw new Error("La clave publica de notificaciones esta vacia.");
  }

  const padding = "=".repeat((4 - (sanitized.length % 4)) % 4);
  const normalized = (sanitized + padding).replace(/-/g, "+").replace(/_/g, "/");

  try {
    const decode =
      typeof globalThis.atob === "function"
        ? globalThis.atob.bind(globalThis)
        : (input: string) => Buffer.from(input, "base64").toString("binary");
    const binary = decode(normalized);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
  } catch {
    throw new Error(
      "La clave publica de notificaciones no tiene un formato valido."
    );
  }
}
