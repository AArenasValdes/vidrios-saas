import { LineasPreciosPageClient } from "@/features/cotizaciones/line-templates/components/lineas-precios-page-client";

type ConfiguracionLineasPreciosPageProps = {
  searchParams?: Promise<{ nueva?: string }>;
};

export default async function ConfiguracionLineasPreciosPage({
  searchParams,
}: ConfiguracionLineasPreciosPageProps) {
  const params = (await searchParams) ?? {};
  return <LineasPreciosPageClient openNewByDefault={params.nueva === "1"} />;
}
