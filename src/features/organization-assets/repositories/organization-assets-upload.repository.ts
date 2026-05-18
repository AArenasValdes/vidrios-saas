import { createClient } from "@/lib/supabase/client";

type UploadAssetKind = "logo" | "hero" | "gallery";

type OrganizationAssetsUploadRepositoryDeps = {
  clientFactory?: ReturnType<typeof createClient>;
  fetchImpl?: typeof fetch;
};

type UploadAssetResult = {
  publicUrl: string;
};

function buildUploadErrorMessage(status: number, fallback?: string) {
  if (fallback?.trim()) {
    return fallback.trim();
  }

  if (status === 401) {
    return "Tu sesion vencio. Vuelve a iniciar sesion para subir archivos.";
  }

  if (status === 403) {
    return "No tienes permisos para subir archivos en esta empresa.";
  }

  return "No se pudo subir el archivo. Intentalo nuevamente.";
}

export function createOrganizationAssetsUploadRepository(
  deps: OrganizationAssetsUploadRepositoryDeps = {}
) {
  const supabase = deps.clientFactory ?? createClient();
  const fetchImpl = deps.fetchImpl ?? fetch;

  return {
    async uploadAsset(kind: UploadAssetKind, file: File): Promise<string> {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token?.trim();

      if (!accessToken) {
        throw new Error(
          "Tu sesion vencio. Vuelve a iniciar sesion para subir archivos."
        );
      }

      const formData = new FormData();
      formData.append("kind", kind);
      formData.append("file", file);

      const response = await fetchImpl("/api/organization-assets/upload", {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as
        | UploadAssetResult
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          buildUploadErrorMessage(
            response.status,
            payload && "error" in payload ? payload.error : undefined
          )
        );
      }

      if (!payload || !("publicUrl" in payload) || !payload.publicUrl) {
        throw new Error("No se pudo obtener la URL publica del archivo subido.");
      }

      return payload.publicUrl;
    },
  };
}

export type OrganizationAssetsUploadRepository = ReturnType<
  typeof createOrganizationAssetsUploadRepository
>;

let defaultOrganizationAssetsUploadRepository:
  | OrganizationAssetsUploadRepository
  | null = null;

function getDefaultOrganizationAssetsUploadRepository() {
  if (!defaultOrganizationAssetsUploadRepository) {
    defaultOrganizationAssetsUploadRepository =
      createOrganizationAssetsUploadRepository();
  }

  return defaultOrganizationAssetsUploadRepository;
}

export const organizationAssetsUploadRepository: OrganizationAssetsUploadRepository =
  {
    uploadAsset(...args) {
      return getDefaultOrganizationAssetsUploadRepository().uploadAsset(...args);
    },
  };
