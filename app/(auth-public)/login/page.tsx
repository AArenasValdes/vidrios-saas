import LoginView from "./login-view";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  description: "Inicia sesión en Ventora para continuar con tus clientes y cotizaciones.",
  alternates: {
    canonical: "https://www.ventorap.cl/login",
  },
};

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    next?: string;
    app_reset?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <LoginView
      oauthError={
        params.error === "oauth" || params.error === "oauth_provider"
      }
      oauthNoEmailError={params.error === "oauth_no_email"}
      identityConflictError={params.error === "identity_conflict"}
      nextPath={params.next ?? null}
      appResetDone={params.app_reset === "1" || params.app_reset === "true"}
    />
  );
}
