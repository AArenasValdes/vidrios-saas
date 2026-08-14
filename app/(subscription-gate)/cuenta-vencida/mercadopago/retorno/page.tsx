import { redirect } from "next/navigation";

import { buildMercadoPagoReturnPath } from "@/features/subscriptions/constants/mercadopago-return";

export const dynamic = "force-dynamic";

export default function MercadoPagoReturnPage() {
  redirect(buildMercadoPagoReturnPath());
}
