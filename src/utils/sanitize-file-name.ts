export function sanitizeFileName(fileName: string) {
  return fileName
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-");
}

export function sanitizeFileNamePart(value: string, maxLength: number = 50) {
  const sanitized = sanitizeFileName(value)
    .replace(/[.\-_]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return sanitized.slice(0, maxLength);
}
