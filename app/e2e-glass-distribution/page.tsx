import { notFound } from "next/navigation";

import GlassDistributionPanelE2eFixture from "./panel-fixture";

export default function GlassDistributionPanelE2ePage() {
  if (process.env.NODE_ENV === "production" || process.env.VENTORA_E2E_TEST_HARNESS !== "1") {
    notFound();
  }

  return <GlassDistributionPanelE2eFixture />;
}
