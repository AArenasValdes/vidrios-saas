import { redirect } from "next/navigation";

export default function ExperimentalLabRedirect() {
  redirect("/cotizaciones/nueva?v2=1");
}
