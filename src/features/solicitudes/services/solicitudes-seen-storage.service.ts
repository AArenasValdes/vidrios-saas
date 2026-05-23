import type { SolicitudContacto } from "@/features/solicitudes/types/solicitud-contacto";

const SOLICITUDES_SEEN_STORAGE_PREFIX = "vidrios-saas:solicitudes-seen:";

function getTimestamp(value: string | null | undefined) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function getSolicitudesSeenStorageKey(
  organizationId: string | number | null | undefined,
  email: string | null | undefined
) {
  if (!organizationId || !email) {
    return null;
  }

  return `${SOLICITUDES_SEEN_STORAGE_PREFIX}${String(organizationId)}:${email
    .trim()
    .toLowerCase()}`;
}

export function readSolicitudesSeenAt(storageKey: string | null) {
  if (typeof window === "undefined" || !storageKey) {
    return 0;
  }

  const rawSeenAt = window.localStorage.getItem(storageKey);
  const parsedSeenAt = rawSeenAt ? Number(rawSeenAt) : 0;

  return Number.isFinite(parsedSeenAt) ? parsedSeenAt : 0;
}

export function getLatestSolicitudesSeenAt(
  solicitudes: SolicitudContacto[],
  currentSeenAt = 0
) {
  return solicitudes.reduce((latest, solicitud) => {
    if (solicitud.estado !== "nueva") {
      return latest;
    }

    return Math.max(latest, getTimestamp(solicitud.creadoEn));
  }, currentSeenAt);
}

export function persistSolicitudesSeenAt(
  storageKey: string | null,
  nextSeenAt: number
) {
  if (typeof window === "undefined" || !storageKey) {
    return;
  }

  window.localStorage.setItem(storageKey, String(nextSeenAt));
}
