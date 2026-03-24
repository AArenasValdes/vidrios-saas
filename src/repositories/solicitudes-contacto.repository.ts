import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  CrearSolicitudContactoInput,
  SolicitudContacto,
} from "@/types/solicitud-contacto";

type SolicitudesContactoRepositoryDeps = {
  clientFactory?: ReturnType<typeof createAdminClient>;
};

type SolicitudContactoRow = {
  id: string;
  nombre: string;
  empresa: string;
  correo: string;
  telefono: string;
  ayuda: string;
  estado: string;
  origen: string;
  ip: string | null;
  user_agent: string | null;
  creado_en: string | null;
  actualizado_en: string | null;
};

const TABLE_NAME = "solicitudes_contacto";
const SOLICITUD_SELECT = `
  id,
  nombre,
  empresa,
  correo,
  telefono,
  ayuda,
  estado,
  origen,
  ip,
  user_agent,
  creado_en,
  actualizado_en
`;

function mapSolicitudContacto(row: SolicitudContactoRow): SolicitudContacto {
  return {
    id: row.id,
    nombre: row.nombre,
    empresa: row.empresa,
    correo: row.correo,
    telefono: row.telefono,
    ayuda: row.ayuda as SolicitudContacto["ayuda"],
    estado: row.estado as SolicitudContacto["estado"],
    origen: row.origen,
    ip: row.ip,
    userAgent: row.user_agent,
    creadoEn: row.creado_en,
    actualizadoEn: row.actualizado_en,
  };
}

export function createSolicitudesContactoRepository(
  deps: SolicitudesContactoRepositoryDeps = {}
) {
  const supabase = deps.clientFactory ?? createAdminClient();

  return {
    async listRecent() {
      const { data, error } = await supabase
        .from(TABLE_NAME as never)
        .select(SOLICITUD_SELECT)
        .order("creado_en", { ascending: false });

      if (error) {
        throw error;
      }

      return ((data as SolicitudContactoRow[] | null) ?? []).map(
        mapSolicitudContacto
      );
    },

    async create(input: CrearSolicitudContactoInput) {
      const { data, error } = await supabase
        .from(TABLE_NAME as never)
        .insert({
          nombre: input.nombre,
          empresa: input.empresa,
          correo: input.correo,
          telefono: input.telefono,
          ayuda: input.ayuda,
          estado: "nueva",
          origen: input.origen ?? "landing",
          ip: input.ip ?? null,
          user_agent: input.userAgent ?? null,
          actualizado_en: new Date().toISOString(),
        } as never)
        .select(SOLICITUD_SELECT)
        .single();

      if (error) {
        throw error;
      }

      return mapSolicitudContacto(data as SolicitudContactoRow);
    },
  };
}

export type SolicitudesContactoRepository = ReturnType<
  typeof createSolicitudesContactoRepository
>;

let defaultSolicitudesContactoRepository: SolicitudesContactoRepository | null =
  null;

function getDefaultSolicitudesContactoRepository() {
  if (!defaultSolicitudesContactoRepository) {
    defaultSolicitudesContactoRepository =
      createSolicitudesContactoRepository();
  }

  return defaultSolicitudesContactoRepository;
}

export const solicitudesContactoRepository: SolicitudesContactoRepository = {
  listRecent(...args) {
    return getDefaultSolicitudesContactoRepository().listRecent(...args);
  },
  create(...args) {
    return getDefaultSolicitudesContactoRepository().create(...args);
  },
};
