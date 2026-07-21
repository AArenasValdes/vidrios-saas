import Image from "next/image";

import {
  getCachedApprovedPublicTestimonialsByOrganizationId,
  getCachedPublicGalleryByOrganizationId,
} from "@/features/solicitudes/services/solicitudes-public-cache.server";

import { SolicitudEmpresaTestimonialForm } from "./solicitud-empresa-testimonial-form";
import s from "./page.module.css";

type GalleryProps = {
  organizationId: string | number;
};

type TestimonialsProps = {
  organizationId: string | number;
  slug: string;
};

/** async-suspense-boundaries: fuera del critical path del hero+form. */
export async function SolicitudEmpresaDeferredGallery({ organizationId }: GalleryProps) {
  const galleryImages = await getCachedPublicGalleryByOrganizationId(organizationId);
  if (galleryImages.length === 0) {
    return null;
  }

  return (
    <section className={s.gallerySection} aria-label="Trabajos recientes">
      <div className={s.sectionHeader}>
        <h2 className={s.sectionTitle}>Trabajos Recientes</h2>
      </div>

      <div className={s.galleryRail}>
        {galleryImages.map((image, index) => (
          <article key={`${image.imageUrl}-${index}`} className={s.portfolioCard}>
            <div className={s.galleryImageWrap}>
              <Image
                src={image.imageUrl}
                alt={image.workTitle || image.label || `Trabajo ${index + 1}`}
                fill
                className={s.galleryImage}
                sizes="(max-width: 768px) 80vw, 280px"
                quality={65}
                loading="lazy"
              />
              {image.workBadge ? (
                <span className={s.galleryTag}>{image.workBadge}</span>
              ) : null}
            </div>
            <div className={s.galleryCardOverlay}>
              <strong>{image.workTitle || image.label || "Trabajo reciente"}</strong>
              <span>{[image.workType, image.workZone].filter(Boolean).join(" · ")}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export async function SolicitudEmpresaDeferredTestimonials({
  organizationId,
  slug,
}: TestimonialsProps) {
  const approvedTestimonials =
    await getCachedApprovedPublicTestimonialsByOrganizationId(organizationId);
  const approvedTestimonialsCount = approvedTestimonials.length;
  const averageRating = approvedTestimonialsCount
    ? (
        approvedTestimonials.reduce((sum, item) => sum + item.estrellas, 0) /
        approvedTestimonialsCount
      ).toFixed(1)
    : null;

  return (
    <>
      {approvedTestimonialsCount > 0 ? (
        <section className={s.sectionCard}>
          <div className={s.sectionHeader}>
            <span className={s.sectionEyebrow}>Clientes que confiaron en nosotros</span>
            <div className={s.testimonialSummaryPublic}>
              <strong>{`★★★★★ ${averageRating}`}</strong>
              <span>{`${approvedTestimonialsCount} valoraciones`}</span>
            </div>
          </div>

          <div className={s.testimonialPublicRail}>
            {approvedTestimonials.slice(0, 3).map((item) => (
              <article key={String(item.id)} className={s.testimonialPublicCard}>
                <div className={s.testimonialPublicTop}>
                  <strong>{item.nombreCorto || "Cliente"}</strong>
                  <span>{`${"★".repeat(item.estrellas)}${"☆".repeat(5 - item.estrellas)}`}</span>
                </div>
                <p>{item.comentario}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className={s.testimonialSection}>
        <SolicitudEmpresaTestimonialForm slug={slug} />
      </section>
    </>
  );
}
