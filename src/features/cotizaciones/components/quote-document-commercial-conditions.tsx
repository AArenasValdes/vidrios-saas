import {
  buildQuoteDocumentCommercialSections,
  type QuoteCommercialConditionsSource,
  type QuoteCommercialOrganizationFallback,
} from "@/features/cotizaciones/services/quote-commercial-conditions.service";

type QuoteDocumentCommercialConditionsProps = {
  source: QuoteCommercialConditionsSource;
  organization?: QuoteCommercialOrganizationFallback | null;
  className?: string;
  sectionClassName?: string;
  titleClassName?: string;
  bodyClassName?: string;
};

export function QuoteDocumentCommercialConditions({
  source,
  organization,
  className,
  sectionClassName,
  titleClassName,
  bodyClassName,
}: QuoteDocumentCommercialConditionsProps) {
  const sections = buildQuoteDocumentCommercialSections(source, organization);

  if (sections.length === 0) {
    return null;
  }

  return (
    <section className={className} aria-label="Condiciones comerciales">
      {sections.map((section) => (
        <article key={section.title} className={sectionClassName}>
          <span className={titleClassName}>{section.title}</span>
          <p className={bodyClassName}>{section.body}</p>
        </article>
      ))}
    </section>
  );
}
