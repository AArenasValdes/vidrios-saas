import { LineasPreciosPageClient } from "@/features/cotizaciones/line-templates/components/lineas-precios-page-client";

type ConfiguracionLineasPreciosPageProps = {
  searchParams?: Promise<{ nueva?: string }>;
};

export default async function ConfiguracionLineasPreciosPage({
  searchParams,
}: ConfiguracionLineasPreciosPageProps) {
  const params = (await searchParams) ?? {};
  const showPurchasePricesEntry =
    process.env.SUPPLIER_CATALOG_V1_ENABLED === "true" &&
    process.env.SUPPLIER_CATALOG_ORG_PRICES_ENABLED === "true";
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
