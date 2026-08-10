"use client";

import { AlertTriangle, Loader2, Sparkles, WandSparkles } from "lucide-react";
import { useState } from "react";

import type { FabricacionAsistenteRespuesta } from "@/features/fabricacion/schemas/fabricacion-asistente.schema";
import {
  aplicarPropuestaAsistenteFabricacion,
  resumirPropuestaAsistenteFabricacion,
} from "@/features/fabricacion/services/fabricacion-asistente.service";
import type { FabricacionReceta } from "@/features/fabricacion/types/fabricacion-domain";

import s from "./fabricacion-workspace.module.css";

export function RecipeTextAssistant({
  recipe,
  providerName,
  lineName,
  onApply,
  applyLabel = "Agregar al borrador editable",
}: {
  recipe: FabricacionReceta;
  providerName: string;
  lineName: string;
  onApply: (recipe: FabricacionReceta) => void;
  applyLabel?: string;
}) {
  const [text, setText] = useState("");
  const [proposal, setProposal] =
    useState<FabricacionAsistenteRespuesta | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = async () => {
    if (text.trim().length < 20) {
      setError("Describe las reglas con al menos 20 caracteres.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setProposal(null);
    try {
      const response = await fetch("/api/fabricacion/asistente-texto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          texto: text,
          contexto: {
            proveedor: providerName,
            linea: lineName,
            tipologia: recipe.identidad.tipologia,
          },
        }),
      });
      const payload = (await response.json()) as {
        propuesta?: FabricacionAsistenteRespuesta;
        error?: string;
      };
      if (!response.ok || !payload.propuesta) {
        throw new Error(payload.error || "No pudimos analizar la explicacion.");
      }
      setProposal(payload.propuesta);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No pudimos analizar la explicacion."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const apply = () => {
    if (!proposal) return;
    onApply(
      aplicarPropuestaAsistenteFabricacion({ receta: recipe, propuesta: proposal })
    );
    setProposal(null);
    setText("");
  };

  const proposalSummary = proposal
    ? resumirPropuestaAsistenteFabricacion(proposal)
    : null;

  return (
    <section className={s.assistantPanel} aria-label="Asistente de receta por texto">
      <div className={s.sectionHeading}>
        <div>
          <h2>Describe cómo fabricas esta línea</h2>
        </div>
        <Sparkles size={20} aria-hidden="true" />
      </div>
      <textarea
        className={s.assistantTextarea}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Ej. El riel superior descuenta 12 mm. Las jambas van al alto. Falta confirmar cuántas jambas usamos."
        rows={5}
      />
      <div className={s.assistantActions}>
        <button
          type="button"
          className={s.primaryButton}
          disabled={isLoading}
          onClick={() => void analyze()}
        >
          {isLoading ? <Loader2 size={16} className={s.spin} /> : <WandSparkles size={16} />}
          Analizar explicacion
        </button>
        <p>Solo crea un borrador. Nada queda validado ni se usa para cortar.</p>
      </div>

      {error ? <div className={s.errorBand}>{error}</div> : null}
      {proposal ? (
        <div className={s.assistantResult}>
          <strong>{proposal.resumen}</strong>
          {proposalSummary ? (
            <p className={s.assistantResultSummary}>
              {proposalSummary.componentes} componentes detectados
              <span aria-hidden="true">·</span>
              {proposalSummary.reglasCompletas} reglas completas
              <span aria-hidden="true">·</span>
              {proposalSummary.datosPendientes} datos por confirmar
            </p>
          ) : null}
          {proposal.preguntas.length > 0 ? (
            <div className={s.assistantQuestions}>
              <span>
                <AlertTriangle size={15} /> Datos por confirmar
              </span>
              <ul>
                {proposal.preguntas.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <button type="button" className={s.secondaryButton} onClick={apply}>
            <WandSparkles size={16} />
            {applyLabel}
          </button>
        </div>
      ) : null}
    </section>
  );
}
