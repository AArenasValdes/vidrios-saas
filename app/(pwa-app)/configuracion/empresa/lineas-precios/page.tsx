import { LineasPreciosPageClient } from "@/features/cotizaciones/line-templates/components/lineas-precios-page-client";

type ConfiguracionLineasPreciosPageProps = {
  searchParams?: Promise<{ nueva?: string }>;
};

export default async function ConfiguracionLineasPreciosPage({
  searchParams,
}: ConfiguracionLineasPreciosPageProps) {
  const params = (await searchParams) ?? {};
  const showPurchasePricesEntry = true;
  const purchasePricesHref = process.env.VENTORA_LOCAL_PRICE_PREVIEW === "true"
    ? "/qa-precios-compra"
    : "/configuracion/empresa/mis-precios";
  return (
    <LineasPreciosPageClient
      openNewByDefault={params.nueva === "1"}
      openNewGlassByDefault={params.nueva === "vidrio"}
      showPurchasePricesEntry={showPurchasePricesEntry}
      purchasePricesHref={purchasePricesHref}
    />
  );
}
