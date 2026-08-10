import { notFound } from "next/navigation";

import { FabricacionLineWorkspace } from "@/features/fabricacion/components/fabricacion-line-workspace";

type PageProps = {
  params: Promise<{ lineTemplateId: string }>;
  searchParams: Promise<{ plantilla?: string }>;
};

export default async function FabricacionLineaPage({ params, searchParams }: PageProps) {
  const { lineTemplateId } = await params;
  const { plantilla } = await searchParams;
  const parsedId = Number(lineTemplateId);

  if (!Number.isInteger(parsedId) || parsedId <= 0) notFound();

  return (
    <FabricacionLineWorkspace
      lineTemplateId={parsedId}
      initialSuggestedRecipeId={plantilla ?? null}
    />
  );
}
