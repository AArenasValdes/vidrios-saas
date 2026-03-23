import LoginView from "./login-view";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return <LoginView oauthError={params.error === "oauth"} nextPath={params.next ?? null} />;
}
