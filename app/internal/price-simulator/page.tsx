import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { InternalPriceSimulatorPage } from "@/features/internal-price-simulator/components/InternalPriceSimulatorPage";
import {
  canAccessInternalPriceSimulator,
  isInternalPriceSimulatorEnabled,
} from "@/features/internal-price-simulator/services/internal-price-simulator-access.service";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Simulador interno",
  themeColor: "#0B0F17",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function InternalPriceSimulatorRoutePage() {
  if (!isInternalPriceSimulatorEnabled()) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!canAccessInternalPriceSimulator({ userId: user?.id })) {
    notFound();
  }

  return <InternalPriceSimulatorPage />;
}
