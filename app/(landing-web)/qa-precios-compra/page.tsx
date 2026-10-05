import { notFound } from "next/navigation";
import PurchasePriceVisualQa from "./preview-client";

export const dynamic = "force-dynamic";

export default function Page() {
  if (process.env.VENTORA_LOCAL_PRICE_PREVIEW !== "true") notFound();
  return <PurchasePriceVisualQa />;
}
