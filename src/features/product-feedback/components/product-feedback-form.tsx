"use client";

import { useState, type FormEvent } from "react";
import { LuCheck, LuSend } from "react-icons/lu";

import { useProductFeedback } from "@/features/product-feedback/hooks/use-product-feedback";
import { PRODUCT_FEEDBACK_CATEGORIES } from "@/features/product-feedback/types/product-feedback";
import s from "./product-feedback-form.module.css";

export function ProductFeedbackForm() {
  const { isSubmitting, error, submit, resetError } = useProductFeedback();
  const [category, setCategory] = useState<(typeof PRODUCT_FEEDBACK_CATEGORIES)[number]["value"] | null>(null);
  const [description, setDescription] = useState("");
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!category) return;

    const saved = await submit({
      category,
      description,
      pagePath: window.location.pathname,
    });

    if (saved) {
      setCategory(null);
      setDescription("");
      setIsSent(true);
    }
  }

  function selectCategory(value: (typeof PRODUCT_FEEDBACK_CATEGORIES)[number]["value"]) {
    setCategory(value);
    setIsSent(false);
    resetError();
  }

  return (
    <main className={s.page}>
      <header className={s.header}>
        <h1>Propuestas para Ventora</h1>
        <p>Comparte una propuesta o comentario para ayudarnos a priorizar el desarrollo para los talleres.</p>
      </header>

      {isSent ? (
        <div className={s.successMessage} role="status">
          <LuCheck aria-hidden />
          <span>Gracias. Recibimos tu propuesta.</span>
        </div>
      ) : null}

      <form className={s.form} onSubmit={(event) => void handleSubmit(event)}>
        <fieldset className={s.categoryFieldset}>
          <legend>¿Sobre qué área quieres compartir tu opinión?</legend>
          <p>Selecciona un área y agrega un comentario si lo deseas. También puedes enviar solo tu preferencia.</p>
          <div className={s.categoryList}>
            {PRODUCT_FEEDBACK_CATEGORIES.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`${s.categoryButton} ${category === item.value ? s.categoryButtonSelected : ""}`}
                aria-pressed={category === item.value}
                onClick={() => selectCategory(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </fieldset>

        <label className={s.commentField}>
          <span>Detalles <span className={s.optionalLabel}>Opcional</span></span>
          <textarea
            value={description}
            onChange={(event) => {
              setDescription(event.target.value.slice(0, 1000));
              setIsSent(false);
              resetError();
            }}
            maxLength={1000}
            rows={5}
            placeholder="¿Qué te gustaría incorporar, ajustar o resolver?"
          />
          <span className={s.commentHint}>
            No incluyas información privada de tus clientes. {description.length}/1000
          </span>
        </label>

        {error ? <p className={s.errorMessage} role="alert">{error}</p> : null}

        <div className={s.formFooter}>
          <p>El equipo de Ventora revisa cada propuesta para priorizar el desarrollo del producto.</p>
          <button className={s.submitButton} type="submit" disabled={!category || isSubmitting}>
            <LuSend aria-hidden />
            {isSubmitting ? "Enviando…" : "Enviar propuesta"}
          </button>
        </div>
      </form>
    </main>
  );
}
