import {
  solicitudesContactoRepository,
  type SolicitudesContactoRepository,
} from "@/repositories/solicitudes-contacto.repository";
import type {
  AyudaSolicitudContacto,
  CrearSolicitudContactoInput,
} from "@/types/solicitud-contacto";

type SolicitudesContactoServiceDeps = {
  repository?: SolicitudesContactoRepository;
};

const AYUDAS_PERMITIDAS = new Set<AyudaSolicitudContacto>([
  "demo",
  "cotizacion",
  "ventas",
]);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export class SolicitudContactoValidationError extends Error {}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizePhone(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function createSolicitudesContactoService(
  deps: SolicitudesContactoServiceDeps = {}
) {
  const repository = deps.repository ?? solicitudesContactoRepository;

  return {
    async listSolicitudes() {
      return repository.listRecent();
    },

    async createSolicitud(input: CrearSolicitudContactoInput) {
      const nombre = normalizeText(input.nombre);
      const empresa = normalizeText(input.empresa);
      const correo = normalizeText(input.correo).toLowerCase();
      const telefono = normalizePhone(input.telefono);
      const ayuda = normalizeText(input.ayuda) as AyudaSolicitudContacto;

      if (nombre.length < 3) {
        throw new SolicitudContactoValidationError(
          "El nombre debe tener al menos 3 caracteres."
        );
      }

      if (empresa.length < 2) {
        throw new SolicitudContactoValidationError(
          "La empresa es obligatoria."
        );
      }

      if (!EMAIL_REGEX.test(correo)) {
        throw new SolicitudContactoValidationError(
          "El correo no es valido."
        );
      }

      const digits = telefono.replace(/\D/g, "");
      if (digits.length < 8) {
        throw new SolicitudContactoValidationError(
          "El telefono no es valido."
        );
      }

      if (!AYUDAS_PERMITIDAS.has(ayuda)) {
        throw new SolicitudContactoValidationError(
          "Selecciona el tipo de ayuda que necesitas."
        );
      }

      return repository.create({
        nombre,
        empresa,
        correo,
        telefono,
        ayuda,
        origen: normalizeText(input.origen ?? "landing") || "landing",
        ip: input.ip?.trim() || null,
        userAgent: input.userAgent?.trim() || null,
      });
    },
  };
}

export const solicitudesContactoService =
  createSolicitudesContactoService();
