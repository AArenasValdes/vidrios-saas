"use client";

import s from "../page.module.css";

type LineFlowPhase = "line" | "work" | "pdf";

const PHASES: { id: LineFlowPhase; label: string }[] = [
  { id: "line", label: "Linea" },
  { id: "work", label: "Trabajo" },
  { id: "pdf", label: "PDF" },
];

export function ActivationLineFlowNav({ phase }: { phase: LineFlowPhase }) {
  const activeIndex = PHASES.findIndex((item) => item.id === phase);

  return (
    <nav className={s.activationLineFlowNav} aria-label="Progreso de tu primera cotizacion">
      <ol className={s.activationLineFlowList}>
        {PHASES.map((item, index) => {
          const isComplete = index < activeIndex;
          const isActive = index === activeIndex;

          return (
            <li
              key={item.id}
              className={`${s.activationLineFlowItem} ${
                isActive ? s.activationLineFlowItemActive : ""
              } ${isComplete ? s.activationLineFlowItemComplete : ""}`}
              aria-current={isActive ? "step" : undefined}
            >
              <span className={s.activationLineFlowDot} aria-hidden>
                {isComplete ? "✓" : index + 1}
              </span>
              <span>{item.label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
