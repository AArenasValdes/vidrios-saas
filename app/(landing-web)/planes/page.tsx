import { permanentRedirect } from "next/navigation";

/** /planes ya no es un paso extra: el CTA de prueba va directo a crear cuenta. */
export const dynamic = "force-static";

export default function PlanesPage() {
  permanentRedirect("/registro");
}
