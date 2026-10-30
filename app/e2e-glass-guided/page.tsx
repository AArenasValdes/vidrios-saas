import { notFound } from "next/navigation";
import GlassGuidedE2eFixture from "./fixture";

export default function GlassGuidedE2ePage() {
  if (process.env.NODE_ENV === "production" || process.env.VENTORA_E2E_TEST_HARNESS !== "1") notFound();
  return <GlassGuidedE2eFixture />;
}
