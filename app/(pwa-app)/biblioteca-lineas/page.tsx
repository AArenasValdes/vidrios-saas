import { FabricacionLibrary } from "@/features/fabricacion/components/fabricacion-library";

type PageProps = {
  searchParams: Promise<{ lineTemplateId?: string }>;
};

export default async function BibliotecaLineasPage({ searchParams }: PageProps) {
  const { lineTemplateId } = await searchParams;
  const parsedLineTemplateId = Number(lineTemplateId);

  return (
    <FabricacionLibrary
      mode="library"
      lineTemplateId={
        Number.isInteger(parsedLineTemplateId) && parsedLineTemplateId > 0
          ? parsedLineTemplateId
          : null
      }
    />
  );
}
