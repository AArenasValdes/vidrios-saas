import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  getOAuthAccountCompletionState,
  resolveOAuthIdentity,
} from "@/features/auth/services/auth-oauth-completion.service";
import { sanitizeAuthNextPath } from "@/features/auth/services/auth-safe-redirect.service";
import CompletarCuentaView from "./completar-cuenta-view";

type CompletarCuentaPageProps = {
  searchParams: Promise<{ next?: string }>;
};

function getGoogleProfileName(metadata: Record<string, unknown>) {
  const fullName = metadata.full_name;
  const name = metadata.name;

  if (typeof fullName === "string" && fullName.trim()) {
    return fullName.trim();
  }

  return typeof name === "string" ? name.trim() : "";
}

export default async function CompletarCuentaPage({
  searchParams,
}: CompletarCuentaPageProps) {
  const params = await searchParams;
  const nextPath = sanitizeAuthNextPath(params.next, "/activacion");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/login?next=/auth/completar-cuenta");
  }

  const identity = await resolveOAuthIdentity({
    authUserId: user.id,
    email: user.email,
  });

  if (identity.status === "linked" && identity.accountComplete) {
    redirect(nextPath);
  }

  if (identity.status === "identity_conflict") {
    redirect("/login?error=identity_conflict");
  }

  const completion = await getOAuthAccountCompletionState({
    authUserId: user.id,
    email: user.email,
  });
  const googleName = getGoogleProfileName(user.user_metadata);

  return (
    <CompletarCuentaView
      nextPath={nextPath}
      email={user.email}
      initialValues={{
        ...completion.values,
        nombre: completion.values.nombre || googleName,
      }}
    />
  );
}
