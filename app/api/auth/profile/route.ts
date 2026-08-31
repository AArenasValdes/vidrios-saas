import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { createUserScopedClient } from "@/lib/supabase/user-scoped";
import { findActiveUserProfile } from "@/features/auth/services/active-user-profile.service";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization")?.trim() ?? "";

  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice(7).trim() || null;
}

function resolveAdminClient() {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

async function resolveUserFromAccessToken(
  accessToken: string,
  admin: ReturnType<typeof createAdminClient> | null
): Promise<User | null> {
  if (admin) {
    const bearerResult = await admin.auth.getUser(accessToken);

    if (!bearerResult.error && bearerResult.data.user) {
      return bearerResult.data.user;
    }
  }

  const scoped = createUserScopedClient(accessToken);

  if (!scoped) {
    return null;
  }

  const scopedResult = await scoped.auth.getUser(accessToken);

  if (!scopedResult.error && scopedResult.data.user) {
    return scopedResult.data.user;
  }

  return null;
}

function resolveProfileClient(
  accessToken: string | null,
  admin: ReturnType<typeof createAdminClient> | null,
  cookieClient: SupabaseClient | null
) {
  if (admin) {
    return admin;
  }

  if (accessToken) {
    const scoped = createUserScopedClient(accessToken);

    if (scoped) {
      return scoped;
    }
  }

  return cookieClient;
}

export async function GET(request: Request) {
  const accessToken = getBearerToken(request);
  const admin = resolveAdminClient();
  let user: User | null = null;
  let cookieClient: Awaited<ReturnType<typeof createServerSupabaseClient>> | null =
    null;

  if (accessToken) {
    user = await resolveUserFromAccessToken(accessToken, admin);
  }

  if (!user) {
    cookieClient = await createServerSupabaseClient();
    const cookieResult = await cookieClient.auth.getUser();

    if (!cookieResult.error && cookieResult.data.user) {
      user = cookieResult.data.user;
    }
  }

  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const profileClient = resolveProfileClient(accessToken, admin, cookieClient);

  if (!profileClient) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const profile = await findActiveUserProfile(profileClient, {
    authUserId: user.id,
    email: user.email,
  });

  return NextResponse.json({
    profile: profile
      ? {
          organizacionId: profile.organization_id,
          rol: profile.rol,
        }
      : null,
  });
}
