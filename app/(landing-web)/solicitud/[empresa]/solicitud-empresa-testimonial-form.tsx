"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { LuSend, LuStar } from "react-icons/lu";

import s from "./page.module.css";

type Props = {
  slug: string;
};

const EMPTY_FORM = {
  nombreCorto: "",
  comentario: "",
  estrellas: 5,
};

export function SolicitudEmpresaTestimonialForm({ slug }: Props) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/solicitud/${slug}/valoraciones`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          payload?.error ?? "No pudimos guardar tu valoracion."
        );
      }

      setSuccessMessage(
        "Gracias. Tu valoracion quedo pendiente de revision antes de publicarse."
      );
      setForm(EMPTY_FORM);
      setIsOpen(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No pudimos guardar tu valoracion."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={s.testimonialFormWrap}>
      <button
        type="button"
        className={s.testimonialToggle}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>Ya trabajaste con nosotros?</span>
        <strong>{isOpen ? "Cerrar valoracion" : "Dejar valoracion"}</strong>
      </button>

      {isOpen ? (
        <form className={s.testimonialForm} onSubmit={handleSubmit}>
          <div className={s.testimonialStarsInput}>
            {[1, 2, 3, 4, 5].map((star) => {
              const isActive = form.estrellas >= star;

              return (
                <button
                  key={star}
                  type="button"
                  className={`${s.testimonialStarButton} ${
                    isActive ? s.testimonialStarButtonActive : ""
                  }`}
                  onClick={() =>
                    setForm((current) => ({ ...current, estrellas: star }))
                  }
                  aria-label={`${star} estrellas`}
                >
                  <LuStar aria-hidden />
                </button>
              );
            })}
          </div>

          <input
            className={s.testimonialInput}
            value={form.nombreCorto}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                nombreCorto: event.target.value,
              }))
            }
            placeholder="Tu nombre (opcional)"
          />

          <textarea
            className={s.testimonialTextarea}
            rows={3}
            value={form.comentario}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                comentario: event.target.value,
              }))
            }
            placeholder="Cuéntanos brevemente cómo fue tu experiencia"
          />

          {errorMessage ? <div className={s.errorBanner}>{errorMessage}</div> : null}
          {successMessage ? (
            <div className={s.successBanner}>
              <div>
                <strong>Valoracion enviada</strong>
                <p>{successMessage}</p>
              </div>
            </div>
          ) : null}

          <button
            type="submit"
            className={s.testimonialSubmit}
            disabled={isSubmitting}
          >
            <LuSend aria-hidden />
            {isSubmitting ? "Enviando..." : "Enviar valoracion"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
