import { createClient } from "@/lib/supabase/client";
import type {
  ActualizarClienteInput,
  Cliente,
  CrearClienteInput,
} from "@/types/cliente";
import type { EntityId } from "@/types/common";

type ClientesRepositoryDeps = {
  clientFactory?: ReturnType<typeof createClient>;
};

type ClienteRow = {
  id: EntityId;
  organization_id: EntityId;
  nombre: string;
  telefono: string | null;
  direccion: string | null;
  correo: string | null;
  creado_en: string | null;
  actualizado_en: string | null;
  eliminado_en: string | null;
};

const CLIENT_SELECT =
  "id, organization_id, nombre, telefono, direccion, correo, creado_en, actualizado_en, eliminado_en";

function mapCliente(row: ClienteRow): Cliente {
  return {
    id: row.id,
    organizationId: row.organization_id,
    nombre: row.nombre,
    telefono: row.telefono,
    direccion: row.direccion,
    correo: row.correo,
    creadoEn: row.creado_en,
    actualizadoEn: row.actualizado_en,
    eliminadoEn: row.eliminado_en,
  };
}

export function createClientesRepository(
  deps: ClientesRepositoryDeps = {}
) {
  const supabase = deps.clientFactory ?? createClient();

  return {
    async listByOrganizationId(organizationId: EntityId) {
      const { data, error } = await supabase
        .from("clients")
        .select(CLIENT_SELECT)
        .eq("organization_id", organizationId)
        .is("eliminado_en", null)
        .order("nombre", { ascending: true });

      if (error) {
        throw error;
      }

      return (data as ClienteRow[]).map(mapCliente);
    },

    async listByIds(ids: EntityId[], organizationId: EntityId) {
      if (ids.length === 0) {
        return [];
      }

      const { data, error } = await supabase
        .from("clients")
        .select(CLIENT_SELECT)
        .eq("organization_id", organizationId)
        .in("id", ids)
        .is("eliminado_en", null);

      if (error) {
        throw error;
      }

      return (data as ClienteRow[]).map(mapCliente);
    },

    async getById(id: EntityId, organizationId: EntityId) {
      const { data, error } = await supabase
        .from("clients")
        .select(CLIENT_SELECT)
        .eq("id", id)
        .eq("organization_id", organizationId)
        .is("eliminado_en", null)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data ? mapCliente(data as ClienteRow) : null;
    },

    async findByNombre(nombre: string, organizationId: EntityId) {
      const normalized = nombre.trim();

      if (!normalized) {
        return null;
      }

      const { data, error } = await supabase
        .from("clients")
        .select(CLIENT_SELECT)
        .eq("organization_id", organizationId)
        .eq("nombre", normalized)
        .is("eliminado_en", null)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data ? mapCliente(data as ClienteRow) : null;
    },

    async create(input: CrearClienteInput) {
      const { data, error } = await supabase
        .from("clients")
        .insert({
          organization_id: input.organizationId,
          nombre: input.nombre,
          telefono: input.telefono ?? null,
          direccion: input.direccion ?? null,
          correo: input.correo ?? null,
        })
        .select(CLIENT_SELECT)
        .single();

      if (error) {
        throw error;
      }

      return mapCliente(data as ClienteRow);
    },

    async update(
      id: EntityId,
      organizationId: EntityId,
      input: ActualizarClienteInput
    ) {
      const payload: Record<string, unknown> = {
        actualizado_en: new Date().toISOString(),
      };

      if (input.nombre !== undefined) {
        payload.nombre = input.nombre;
      }

      if (input.telefono !== undefined) {
        payload.telefono = input.telefono;
      }

      if (input.direccion !== undefined) {
        payload.direccion = input.direccion;
      }

      if (input.correo !== undefined) {
        payload.correo = input.correo;
      }

      const { data, error } = await supabase
        .from("clients")
        .update(payload)
        .eq("id", id)
        .eq("organization_id", organizationId)
        .is("eliminado_en", null)
        .select(CLIENT_SELECT)
        .single();

      if (error) {
        throw error;
      }

      return mapCliente(data as ClienteRow);
    },

    async softDelete(id: EntityId, organizationId: EntityId) {
      const { error } = await supabase
        .from("clients")
        .update({
          eliminado_en: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("organization_id", organizationId)
        .is("eliminado_en", null);

      if (error) {
        throw error;
      }
    },
  };
}

export type ClientesRepository = ReturnType<typeof createClientesRepository>;

let defaultClientesRepository: ClientesRepository | null = null;

function getDefaultClientesRepository() {
  if (!defaultClientesRepository) {
    defaultClientesRepository = createClientesRepository();
  }

  return defaultClientesRepository;
}

export const clientesRepository: ClientesRepository = {
  listByOrganizationId(...args) {
    return getDefaultClientesRepository().listByOrganizationId(...args);
  },
  listByIds(...args) {
    return getDefaultClientesRepository().listByIds(...args);
  },
  getById(...args) {
    return getDefaultClientesRepository().getById(...args);
  },
  findByNombre(...args) {
    return getDefaultClientesRepository().findByNombre(...args);
  },
  create(...args) {
    return getDefaultClientesRepository().create(...args);
  },
  update(...args) {
    return getDefaultClientesRepository().update(...args);
  },
  softDelete(...args) {
    return getDefaultClientesRepository().softDelete(...args);
  },
};
