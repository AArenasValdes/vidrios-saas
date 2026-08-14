import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { findActiveUserProfile } from "@/features/auth/services/active-user-profile.service";
import {
  ORGANIZATION_ASSET_LOGO_MAX_BYTES,
  ORGANIZATION_ASSET_MULTIPART_OVERHEAD_BYTES,
  ORGANIZATION_ASSET_WEB_IMAGE_MAX_BYTES,
} from "@/features/organization-assets/constants/upload-constraints";
import {
  normalizeOrganizationAssetImage,
  OrganizationAssetImageProcessingError,
  type NormalizedOrganizationAsset,
  type OrganizationAssetUploadKind,
} from "@/features/organization-assets/services/organization-asset-image-normalizer.service";
import {
  getSubscriptionSnapshotByOrganizationId,
} from "@/features/subscriptions/services/subscription-route-access.service";
import {
  assertSubscriptionAllowsWrite,
  resolveOrganizationSubscriptionState,
  SubscriptionWriteAccessError,
} from "@/features/subscriptions/services/subscription-status.service";
import { sanitizeFileName } from "@/utils/sanitize-file-name";
import {
  isRequestBodyTooLargeError,
  parseBoundedFormData,
} from "@/features/solicitudes/services/solicitudes-public-http.service";

const BUCKET_NAME = "organization-assets";
const ALLOWED_KINDS = new Set(["logo", "hero", "gallery"]);
const ALLOWED_RASTER_MIME_TYPES = new Set([
  "image/avif",
  "image/heic",
  "image/heif",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);
const MAX_MULTIPART_BYTES =
  ORGANIZATION_ASSET_WEB_IMAGE_MAX_BYTES +
  ORGANIZATION_ASSET_MULTIPART_OVERHEAD_BYTES;

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization")?.trim() ?? "";

  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice(7).trim() || null;
}

function getKindConfig(kind: OrganizationAssetUploadKind) {
  switch (kind) {
    case "logo":
      return {
        maxSizeBytes: ORGANIZATION_ASSET_LOGO_MAX_BYTES,
        errorLabel: "logo",
        article: "El",
        folder: "brand",
        prefix: "logo",
      };
    case "hero":
      return {
        maxSizeBytes: ORGANIZATION_ASSET_WEB_IMAGE_MAX_BYTES,
        errorLabel: "imagen de portada",
        article: "La",
        folder: "hero",
        prefix: "hero",
      };
    case "gallery":
      return {
        maxSizeBytes: ORGANIZATION_ASSET_WEB_IMAGE_MAX_BYTES,
        errorLabel: "foto de trabajo",
        article: "La",
        folder: "gallery",
        prefix: "gallery",
      };
  }
}

function buildStoragePath(
  organizationId: string | number,
  kind: OrganizationAssetUploadKind,
  file: File,
  extension?: string
) {
  const config = getKindConfig(kind);
  const resolvedExtension =
    extension?.trim().toLowerCase() ||
    file.name.split(".").pop()?.toLowerCase() ||
    "jpg";
  const sanitizedName = sanitizeFileName(file.name.replace(/\.[^.]+$/, ""));

  return `${organizationId}/${config.folder}/${config.prefix}-${Date.now()}-${sanitizedName}.${resolvedExtension}`;
}

function normalizeStorageError(error: { message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? "";

  if (message.includes("bucket")) {
    return "Falta configurar el bucket organization-assets en Supabase.";
  }

  return "No se pudo subir el archivo. Intentalo nuevamente.";
}

export async function POST(request: Request) {
  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const admin = createAdminClient();
  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(accessToken);

  if (userError || !user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const profile = await findActiveUserProfile(admin, {
    authUserId: user.id,
    email: user.email,
  });

  const organizationId = profile?.organization_id;

  if (!organizationId) {
    return NextResponse.json(
      { error: "No pudimos identificar la organizacion activa." },
      { status: 403 }
    );
  }

  try {
    const snapshot = await getSubscriptionSnapshotByOrganizationId(admin, organizationId);
    assertSubscriptionAllowsWrite(resolveOrganizationSubscriptionState(snapshot));
  } catch (error) {
    if (error instanceof SubscriptionWriteAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    throw error;
  }

  let formData: FormData | null;

  try {
    formData = await parseBoundedFormData(request, MAX_MULTIPART_BYTES);
  } catch (error) {
    if (isRequestBodyTooLargeError(error)) {
      return NextResponse.json(
        { error: "La solicitud de subida supera el limite permitido." },
        { status: 413 }
      );
    }

    throw error;
  }
  const kindValue = formData?.get("kind");
  const fileValue = formData?.get("file");

  if (
    typeof kindValue !== "string" ||
    !ALLOWED_KINDS.has(kindValue) ||
    !(fileValue instanceof File)
  ) {
    return NextResponse.json(
      { error: "La solicitud de subida es invalida." },
      { status: 400 }
    );
  }

  const kind = kindValue as OrganizationAssetUploadKind;
  const file = fileValue;
  const config = getKindConfig(kind);

  if (!ALLOWED_RASTER_MIME_TYPES.has(file.type.toLowerCase())) {
    return NextResponse.json(
      { error: `${config.article} ${config.errorLabel} debe ser una imagen.` },
      { status: 400 }
    );
  }

  if (file.size > config.maxSizeBytes) {
    return NextResponse.json(
      {
        error: `${config.article} ${config.errorLabel} no puede pesar mas de ${Math.floor(
          config.maxSizeBytes / (1024 * 1024)
        )} MB antes de optimizarse.`,
      },
      { status: 400 }
    );
  }

  let normalizedAsset: NormalizedOrganizationAsset;

  try {
    normalizedAsset = await normalizeOrganizationAssetImage(kind, file);
  } catch (error) {
    if (error instanceof OrganizationAssetImageProcessingError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "No se pudo preparar la imagen para subirla." },
      { status: 500 }
    );
  }

  const storagePath = buildStoragePath(
    organizationId,
    kind,
    file,
    normalizedAsset.extension
  );
  const { error } = await admin.storage
    .from(BUCKET_NAME)
    .upload(storagePath, normalizedAsset.body, {
      upsert: true,
      contentType: normalizedAsset.contentType,
    });

  if (error) {
    return NextResponse.json(
      { error: normalizeStorageError(error) },
      { status: 500 }
    );
  }

  const {
    data: { publicUrl },
  } = admin.storage.from(BUCKET_NAME).getPublicUrl(storagePath);

  return NextResponse.json({ publicUrl });
}
