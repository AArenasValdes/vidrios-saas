import { createClient } from "@/lib/supabase/client";
import type { EntityId } from "@/types/common";
import type {
  ActualizarProjectInput,
  CrearProjectInput,
  Project,
} from "@/types/project";

type ProjectsRepositoryDeps = {
  clientFactory?: ReturnType<typeof createClient>;
};

type ProjectRow = {
  id: EntityId;
  titulo: string;
  descripcion: string | null;
  cliente_id: EntityId | null;
  organization_id: EntityId;
  creado_en: string | null;
  estado: string | null;
  actualizado_en: string | null;
  eliminado_en: string | null;
};

const PROJECT_SELECT =
  "id, titulo, descripcion, cliente_id, organization_id, creado_en, estado, actualizado_en, eliminado_en";

function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    titulo: row.titulo,
    descripcion: row.descripcion,
    clienteId: row.cliente_id,
    organizationId: row.organization_id,
    creadoEn: row.creado_en,
    estado: row.estado,
    actualizadoEn: row.actualizado_en,
    eliminadoEn: row.eliminado_en,
  };
}

export function createProjectsRepository(
  deps: ProjectsRepositoryDeps = {}
) {
  const supabase = deps.clientFactory ?? createClient();

  return {
    async listByOrganizationId(organizationId: EntityId) {
      const { data, error } = await supabase
        .from("projects")
        .select(PROJECT_SELECT)
        .eq("organization_id", organizationId)
        .is("eliminado_en", null)
        .order("titulo", { ascending: true });

      if (error) {
        throw error;
      }

      return (data as ProjectRow[]).map(mapProject);
    },

    async listByIds(ids: EntityId[], organizationId: EntityId) {
      if (ids.length === 0) {
        return [];
      }

      const { data, error } = await supabase
        .from("projects")
        .select(PROJECT_SELECT)
        .eq("organization_id", organizationId)
        .in("id", ids)
        .is("eliminado_en", null);

      if (error) {
        throw error;
      }

      return (data as ProjectRow[]).map(mapProject);
    },

    async getById(id: EntityId, organizationId: EntityId) {
      const { data, error } = await supabase
        .from("projects")
        .select(PROJECT_SELECT)
        .eq("id", id)
        .eq("organization_id", organizationId)
        .is("eliminado_en", null)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data ? mapProject(data as ProjectRow) : null;
    },

    async findByTitleAndClientId(
      titulo: string,
      clienteId: EntityId,
      organizationId: EntityId
    ) {
      const normalized = titulo.trim();

      if (!normalized) {
        return null;
      }

      const { data, error } = await supabase
        .from("projects")
        .select(PROJECT_SELECT)
        .eq("titulo", normalized)
        .eq("cliente_id", clienteId)
        .eq("organization_id", organizationId)
        .is("eliminado_en", null)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data ? mapProject(data as ProjectRow) : null;
    },

    async create(input: CrearProjectInput) {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          titulo: input.titulo,
          descripcion: input.descripcion ?? null,
          cliente_id: input.clienteId ?? null,
          organization_id: input.organizationId,
          estado: input.estado ?? "activo",
        })
        .select(PROJECT_SELECT)
        .single();

      if (error) {
        throw error;
      }

      return mapProject(data as ProjectRow);
    },

    async update(
      id: EntityId,
      organizationId: EntityId,
      input: ActualizarProjectInput
    ) {
      const { data, error } = await supabase
        .from("projects")
        .update({
          titulo: input.titulo,
          descripcion: input.descripcion,
          cliente_id: input.clienteId,
          estado: input.estado,
          actualizado_en: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("organization_id", organizationId)
        .is("eliminado_en", null)
        .select(PROJECT_SELECT)
        .single();

      if (error) {
        throw error;
      }

      return mapProject(data as ProjectRow);
    },

    async softDelete(id: EntityId, organizationId: EntityId) {
      const { error } = await supabase
        .from("projects")
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

export type ProjectsRepository = ReturnType<typeof createProjectsRepository>;

let defaultProjectsRepository: ProjectsRepository | null = null;

function getDefaultProjectsRepository() {
  if (!defaultProjectsRepository) {
    defaultProjectsRepository = createProjectsRepository();
  }

  return defaultProjectsRepository;
}

export const projectsRepository: ProjectsRepository = {
  listByOrganizationId(...args) {
    return getDefaultProjectsRepository().listByOrganizationId(...args);
  },
  listByIds(...args) {
    return getDefaultProjectsRepository().listByIds(...args);
  },
  getById(...args) {
    return getDefaultProjectsRepository().getById(...args);
  },
  findByTitleAndClientId(...args) {
    return getDefaultProjectsRepository().findByTitleAndClientId(...args);
  },
  create(...args) {
    return getDefaultProjectsRepository().create(...args);
  },
  update(...args) {
    return getDefaultProjectsRepository().update(...args);
  },
  softDelete(...args) {
    return getDefaultProjectsRepository().softDelete(...args);
  },
};
