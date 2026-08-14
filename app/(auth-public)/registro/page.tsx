import RegistroView from "./registro-view";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Crear cuenta",
  description:
    "Crea tu cuenta de Ventora y prepara tu primera cotización. 15 días de acceso completo, sin tarjeta.",
  alternates: {
    canonical: "https://www.ventorap.cl/registro",
  },
};

export default function RegistroPage() {
  return <RegistroView />;
}
