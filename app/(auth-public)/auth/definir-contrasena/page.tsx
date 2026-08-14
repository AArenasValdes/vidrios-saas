import type { Metadata } from "next";

import DefinePasswordView from "./define-password-view";

export const metadata: Metadata = {
  title: "Define tu contraseña",
  description: "Completa de forma segura la activación de tu cuenta Ventora.",
  robots: { index: false, follow: false },
};

export default function DefinePasswordPage() {
  return <DefinePasswordView />;
}
