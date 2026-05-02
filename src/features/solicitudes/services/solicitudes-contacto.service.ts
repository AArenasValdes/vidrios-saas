import {
  solicitudesContactoRepository,
  type SolicitudesContactoRepository,
} from "@/features/solicitudes/repositories/solicitudes-contacto.repository";
import type {
  AyudaSolicitudContacto,
  CrearSolicitudEmpresaInput,
  CrearSolicitudContactoInput,
  EstadoSolicitudContacto,
} from "@/features/solicitudes/types/solicitud-contacto";
import {
  webPushNotificationsService,
  type WebPushNotificationsService,
} from "@/features/notificaciones/services/web-push-notifications.service";
import {
  isValidChileMobilePhone,
  normalizeChileMobilePhone,
} from "@/utils/chile-mobile-phone";

type SolicitudesContactoServiceDeps = {
  repository?: SolicitudesContactoRepository;
  notificationsService?: WebPushNotificationsService;
};

const AYUDAS_PERMITIDAS = new Set<AyudaSolicitudContacto>([
  "demo",
  "cotizacion",
  "ventas",
]);
const ESTADOS_PERMITIDOS = new Set<EstadoSolicitudContacto>([
  "nueva",
  "contactada",
  "cerrada",
  "descartada",
]);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const FIELD_LIMITS = {
  nombre: 80,
  empresa: 100,
  correo: 160,
  telefono: 32,
  contacto: 160,
  tipoTrabajo: 100,
  mensaje: 280,
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
  const notificationsService =
    deps.notificationsService ?? webPushNotificationsService;

  async function notifyOrganizationLead(input: {
    organizationId: string | number;
    nombre: string;
    tipoTrabajo: string;
    empresa: string;
  }) {
    void notificationsService
      .sendLeadCreatedPush({
        organizationId: input.organizationId,
        prospectoNombre: input.nombre,
        empresaNombre: input.empresa,
        tipoTrabajo: input.tipoTrabajo,
      })
      .catch(() => undefined);
  }

  return {
    async listSolicitudes() {
      return repository.listRecent();
    },

    async listSolicitudesByOrganizationId(organizationId: string | number) {
      return repository.listByOrganizationId(organizationId);
    },

    async getPublicRequestConfig(slug: string) {
      const normalizedSlug = limitText(
        normalizeText(slug)
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9-]+/g, "-")
          .replace(/^-+|-+$/g, ""),
        48
      );

      if (!normalizedSlug) {
        return null;
      }

      return repository.getPublicConfigBySlug(normalizedSlug);
    },

    async createSolicitud(input: CrearSolicitudContactoInput) {
      const nombre = limitText(normalizeText(input.nombre), FIELD_LIMITS.nombre);
      const empresa = limitText(normalizeText(input.empresa), FIELD_LIMITS.empresa);
      const correo = limitText(
        normalizeText(input.correo).toLowerCase(),
        FIELD_LIMITS.correo
      );
      const telefonoRaw = limitText(
        normalizePhone(input.telefono),
        FIELD_LIMITS.telefono
      );
      const telefono = normalizeChileMobilePhone(telefonoRaw) ?? telefonoRaw;
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

      if (!isValidChileMobilePhone(telefonoRaw)) {
        throw new SolicitudContactoValidationError(
          "Ingresa un WhatsApp válido."
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

    async createPublicRequest(input: CrearSolicitudEmpresaInput) {
      const nombre = limitText(normalizeText(input.nombre), FIELD_LIMITS.nombre);
      const empresa = limitText(normalizeText(input.empresa), FIELD_LIMITS.empresa);
      const contactoRaw = limitText(
        normalizeText(input.contacto),
        FIELD_LIMITS.contacto
      );
      const contacto = normalizeChileMobilePhone(contactoRaw);
      const tipoTrabajo = limitText(
        normalizeText(input.tipoTrabajo),
        FIELD_LIMITS.tipoTrabajo
      );
      const mensaje = limitText(
        normalizeText(input.mensaje ?? ""),
        FIELD_LIMITS.mensaje
      );

      if (nombre.length < 3) {
        throw new SolicitudContactoValidationError(
          "El nombre debe tener al menos 3 caracteres."
        );
      }

      if (!empresa) {
        throw new SolicitudContactoValidationError(
          "No pudimos identificar la empresa de destino."
        );
      }

      if (!contacto) {
        throw new SolicitudContactoValidationError(
          "Ingresa un WhatsApp válido."
        );
      }

      if (tipoTrabajo.length < 3) {
        throw new SolicitudContactoValidationError(
          "Cuéntanos brevemente qué trabajo necesitas."
        );
      }

      const solicitud = await repository.createPublicRequest({
        organizationId: input.organizationId,
        empresa,
        nombre,
        contacto,
        tipoTrabajo,
        mensaje,
        origen:
          limitText(
            normalizeText(input.origen ?? "solicitud-publica"),
            FIELD_LIMITS.origen
          ) || "solicitud-publica",
        ip: input.ip?.trim()
          ? limitText(input.ip.trim(), FIELD_LIMITS.ip)
          : null,
        userAgent: input.userAgent?.trim()
          ? limitText(input.userAgent.trim(), FIELD_LIMITS.userAgent)
          : null,
      });

      notifyOrganizationLead({
        organizationId: input.organizationId,
        nombre,
        tipoTrabajo,
        empresa,
      });

      return solicitud;
    },

    async updateSolicitudStatus(input: {
      id: string;
      estado: EstadoSolicitudContacto;
      organizationId?: string | number | null;
    }) {
      const id = normalizeText(input.id);
      const estado = normalizeText(input.estado) as EstadoSolicitudContacto;

      if (!id) {
        throw new SolicitudContactoValidationError(
          "No pudimos identificar la solicitud."
        );
      }

      if (!ESTADOS_PERMITIDOS.has(estado)) {
        throw new SolicitudContactoValidationError(
          "Selecciona un estado válido."
        );
      }

      return repository.updateStatusById({
        id,
        estado,
        organizationId: input.organizationId,
      });
    },
  };
}

export const solicitudesContactoService =
  createSolicitudesContactoService();
