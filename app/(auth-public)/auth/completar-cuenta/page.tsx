import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { resolveOAuthIdentity } from "@/features/auth/services/auth-oauth-completion.service";
import { sanitizeAuthNextPath } from "@/features/auth/services/auth-safe-redirect.service";
import { resolveOAuthProvider } from "@/features/auth/services/auth-server.service";
import CompletarCuentaView from "./completar-cuenta-view";

type CompletarCuentaPageProps = {
  searchParams: Promise<{ next?: string; provider?: string }>;
};

export default async function CompletarCuentaPage({
  searchParams,
}: CompletarCuentaPageProps) {
  const params = await searchParams;
  const nextPath = sanitizeAuthNextPath(params.next);
  const provider = resolveOAuthProvider(params.provider);
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

  if (identity.status === "linked") {
    redirect(nextPath);
  }

  if (identity.status === "identity_conflict") {
    redirect("/login?error=identity_conflict");
  }

  return (
    <CompletarCuentaView
      nextPath={nextPath}
      email={user.email}
      provider={provider}
    />
  );
}
