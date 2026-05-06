import { solicitudesContactoRepository } from "@/features/solicitudes/repositories/solicitudes-contacto.repository";
import { webPushNotificationsService } from "@/features/notificaciones/services/web-push-notifications.service";
import { isValidChileMobilePhone, normalizeChileMobilePhone } from "@/utils/chile-mobile-phone";
import type {
  AyudaSolicitudContacto,
  EstadoSolicitudContacto,
  SolicitudContacto,
  CrearSolicitudContactoInput,
  CrearSolicitudEmpresaInput,
} from "@/features/solicitudes/types/solicitud-contacto";

/* ------------------------------------------------------------------ */
/*  Constantes                                                         */
/* ------------------------------------------------------------------ */

const AYUDAS_PERMITIDAS = new Set<AyudaSolicitudContacto>(["demo", "cotizacion", "ventas"]);
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
  utmSource: 80,
  utmMedium: 80,
  utmCampaign: 160,
  sourceUrl: 2048,
} as const;

/* ------------------------------------------------------------------ */
/*  Utilidades                                                         */
/* ------------------------------------------------------------------ */

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizePhone(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function limitText(value: string, maxLength: number) {
  return value.slice(0, maxLength);
}

/* ------------------------------------------------------------------ */
/*  Clase error                                                        */
/* ------------------------------------------------------------------ */

export class SolicitudContactoValidationError extends Error {}

/* ------------------------------------------------------------------ */
/*  Service                                                             */
/* ------------------------------------------------------------------ */

export interface SolicitudesContactoService {
  listSolicitudes(): Promise<SolicitudContacto[]>;
  listSolicitudesByOrganizationId(organizationId: string | number): Promise<SolicitudContacto[]>;
  getPublicRequestConfig(slug: string): Promise<any>;
  createSolicitud(input: CrearSolicitudContactoInput): Promise<SolicitudContacto>;
  createPublicRequest(input: CrearSolicitudEmpresaInput): Promise<SolicitudContacto>;
  updateSolicitudStatus(input: {
    id: string;
    estado: EstadoSolicitudContacto;
    organizationId?: string | number | null;
  }): Promise<SolicitudContacto>;
}

export function createSolicitudesContactoService(
  deps?: {
    repository?: unknown;
    notificationsService?: unknown;
  }
): SolicitudesContactoService {
  return {
    async listSolicitudes() {
      return solicitudesContactoRepository.listRecent();
    },

    async listSolicitudesByOrganizationId(organizationId: string | number) {
      return solicitudesContactoRepository.listByOrganizationId(organizationId);
    },

    async getPublicRequestConfig(slug: string) {
      // delegado al repository para mantener compatibilidad
      return solicitudesContactoRepository.getPublicConfigBySlug(slug);
    },

    async createSolicitud(input: CrearSolicitudContactoInput) {
      const nombre = limitText(normalizeText(input.nombre), FIELD_LIMITS.nombre);
      const empresa = limitText(normalizeText(input.empresa), FIELD_LIMITS.empresa);
      const correo = limitText(normalizeText(input.correo).toLowerCase(), FIELD_LIMITS.correo);
      const telefonoRaw = limitText(normalizePhone(input.telefono), FIELD_LIMITS.telefono);
      const telefono = normalizeChileMobilePhone(telefonoRaw) ?? telefonoRaw;
      const ayuda = normalizeText(input.ayuda) as AyudaSolicitudContacto;

      if (nombre.length < 3) {
        throw new SolicitudContactoValidationError("El nombre debe tener al menos 3 caracteres.");
      }

      if (empresa.length < 2) {
        throw new SolicitudContactoValidationError("La empresa es obligatoria.");
      }

      if (!EMAIL_REGEX.test(correo)) {
        throw new SolicitudContactoValidationError("El correo no es válido.");
      }

      if (!isValidChileMobilePhone(telefonoRaw)) {
        throw new SolicitudContactoValidationError("Ingresa un WhatsApp válido.");
      }

      if (!AYUDAS_PERMITIDAS.has(ayuda)) {
        throw new SolicitudContactoValidationError("Selecciona el tipo de ayuda que necesitas.");
      }

      return solicitudesContactoRepository.create({
        nombre,
        empresa,
        correo,
        telefono,
        ayuda,
        origen: limitText(normalizeText(input.origen ?? "landing"), FIELD_LIMITS.origen) || "landing",
        ip: input.ip?.trim() ? limitText(input.ip.trim(), FIELD_LIMITS.ip) : null,
        userAgent: input.userAgent?.trim()
          ? limitText(input.userAgent.trim(), FIELD_LIMITS.userAgent)
          : null,
        utmSource: input.utmSource?.trim()
          ? limitText(normalizeText(input.utmSource), FIELD_LIMITS.utmSource)
          : null,
        utmMedium: input.utmMedium?.trim()
          ? limitText(normalizeText(input.utmMedium), FIELD_LIMITS.utmMedium)
          : null,
        utmCampaign: input.utmCampaign?.trim()
          ? limitText(normalizeText(input.utmCampaign), FIELD_LIMITS.utmCampaign)
          : null,
        sourceUrl: input.sourceUrl?.trim()
          ? limitText(input.sourceUrl.trim(), FIELD_LIMITS.sourceUrl)
          : null,
      });
    },

    async createPublicRequest(input: CrearSolicitudEmpresaInput) {
      const nombre = limitText(normalizeText(input.nombre), FIELD_LIMITS.nombre);
      const empresa = limitText(normalizeText(input.empresa), FIELD_LIMITS.empresa);
      const contactoRaw = limitText(normalizeText(input.contacto), FIELD_LIMITS.contacto);
      const contacto = normalizeChileMobilePhone(contactoRaw);
      const tipoTrabajo = limitText(normalizeText(input.tipoTrabajo), FIELD_LIMITS.tipoTrabajo);
      const mensaje = limitText(normalizeText(input.mensaje ?? ""), FIELD_LIMITS.mensaje);

      if (nombre.length < 3) {
        throw new SolicitudContactoValidationError("El nombre debe tener al menos 3 caracteres.");
      }

      if (!empresa) {
        throw new SolicitudContactoValidationError("No pudimos identificar la empresa de destino.");
      }

      if (!contacto) {
        throw new SolicitudContactoValidationError("Ingresa un WhatsApp válido.");
      }

      if (tipoTrabajo.length < 3) {
        throw new SolicitudContactoValidationError("Cuéntanos brevemente qué trabajo necesitas.");
      }

      const solicitud = await solicitudesContactoRepository.createPublicRequest({
        organizationId: input.organizationId,
        empresa,
        nombre,
        contacto,
        tipoTrabajo,
        mensaje,
        origen: limitText(normalizeText(input.origen ?? "solicitud-publica"), FIELD_LIMITS.origen) || "solicitud-publica",
        ip: input.ip?.trim() ? limitText(input.ip.trim(), FIELD_LIMITS.ip) : null,
        userAgent: input.userAgent?.trim()
          ? limitText(input.userAgent.trim(), FIELD_LIMITS.userAgent)
          : null,
        utmSource: input.utmSource?.trim()
          ? limitText(normalizeText(input.utmSource), FIELD_LIMITS.utmSource)
          : null,
        utmMedium: input.utmMedium?.trim()
          ? limitText(normalizeText(input.utmMedium), FIELD_LIMITS.utmMedium)
          : null,
        utmCampaign: input.utmCampaign?.trim()
          ? limitText(normalizeText(input.utmCampaign), FIELD_LIMITS.utmCampaign)
          : null,
        sourceUrl: input.sourceUrl?.trim()
          ? limitText(input.sourceUrl.trim(), FIELD_LIMITS.sourceUrl)
          : null,
      });

      // Notificar al vendedor (async, no bloquea)
      void webPushNotificationsService
        .sendLeadCreatedPush({
          organizationId: input.organizationId,
          prospectoNombre: nombre,
          empresaNombre: empresa,
          tipoTrabajo,
        })
        .catch(() => undefined);

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
        throw new SolicitudContactoValidationError("No pudimos identificar la solicitud.");
      }

      if (!ESTADOS_PERMITIDOS.has(estado)) {
        throw new SolicitudContactoValidationError("Selecciona un estado válido.");
      }

      return solicitudesContactoRepository.updateStatusById({
        id,
        estado,
        organizationId: input.organizationId,
      });
    },
  };
}

export const solicitudesContactoService = createSolicitudesContactoService();
