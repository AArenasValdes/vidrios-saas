import {
  solicitudesContactoRepository,
  type SolicitudesContactoRepository,
} from "@/features/solicitudes/repositories/solicitudes-contacto.repository";
import type {
  AyudaSolicitudContacto,
  CrearSolicitudContactoInput,
} from "@/features/solicitudes/types/solicitud-contacto";

type SolicitudesContactoServiceDeps = {
  repository?: SolicitudesContactoRepository;
};

const AYUDAS_PERMITIDAS = new Set<AyudaSolicitudContacto>([
  "demo",
  "cotizacion",
  "ventas",
]);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const FIELD_LIMITS = {
  nombre: 80,
  empresa: 100,
  correo: 160,
  telefono: 32,
  origen: 40,
  ip: 80,
  userAgent: 240,
} as const;

export class SolicitudContactoValidationError extends Error {}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizePhone(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function limitText(value: string, maxLength: number) {
  return value.slice(0, maxLength);
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
      const nombre = limitText(normalizeText(input.nombre), FIELD_LIMITS.nombre);
      const empresa = limitText(normalizeText(input.empresa), FIELD_LIMITS.empresa);
      const correo = limitText(
        normalizeText(input.correo).toLowerCase(),
        FIELD_LIMITS.correo
      );
      const telefono = limitText(normalizePhone(input.telefono), FIELD_LIMITS.telefono);
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
        origen:
          limitText(normalizeText(input.origen ?? "landing"), FIELD_LIMITS.origen) ||
          "landing",
        ip: input.ip?.trim()
          ? limitText(input.ip.trim(), FIELD_LIMITS.ip)
          : null,
        userAgent: input.userAgent?.trim()
          ? limitText(input.userAgent.trim(), FIELD_LIMITS.userAgent)
          : null,
      });
    },
  };
}

export const solicitudesContactoService =
  createSolicitudesContactoService();
