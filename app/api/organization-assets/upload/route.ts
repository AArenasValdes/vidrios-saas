import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { findActiveUserProfile } from "@/features/auth/services/active-user-profile.service";
import { sanitizeFileName } from "@/utils/sanitize-file-name";

const BUCKET_NAME = "organization-assets";
const ALLOWED_KINDS = new Set(["logo", "hero", "gallery"]);

type UploadKind = "logo" | "hero" | "gallery";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization")?.trim() ?? "";

  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice(7).trim() || null;
}

function getKindConfig(kind: UploadKind) {
  switch (kind) {
    case "logo":
      return {
        maxSizeBytes: 5 * 1024 * 1024,
        errorLabel: "logo",
        article: "El",
        folder: "brand",
        prefix: "logo",
      };
    case "hero":
      return {
        maxSizeBytes: 10 * 1024 * 1024,
        errorLabel: "imagen de portada",
        article: "La",
        folder: "hero",
        prefix: "hero",
      };
    case "gallery":
      return {
        maxSizeBytes: 10 * 1024 * 1024,
        errorLabel: "foto de trabajo",
        article: "La",
        folder: "gallery",
        prefix: "gallery",
      };
  }
}

function buildStoragePath(organizationId: string | number, kind: UploadKind, file: File) {
  const config = getKindConfig(kind);
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const sanitizedName = sanitizeFileName(file.name.replace(/\.[^.]+$/, ""));

  return `${organizationId}/${config.folder}/${config.prefix}-${Date.now()}-${sanitizedName}.${extension}`;
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

  const formData = await request.formData().catch(() => null);
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

  const kind = kindValue as UploadKind;
  const file = fileValue;
  const config = getKindConfig(kind);

  if (!file.type.startsWith("image/")) {
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
        )} MB.`,
      },
      { status: 400 }
    );
  }

  const storagePath = buildStoragePath(organizationId, kind, file);
  const { error } = await admin.storage.from(BUCKET_NAME).upload(storagePath, file, {
    upsert: true,
    contentType: file.type,
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
