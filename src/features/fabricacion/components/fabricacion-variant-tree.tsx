"use client";

import { AlertTriangle, CheckCircle2, Circle } from "lucide-react";

import type {
  FabricacionVariantTreeGroup,
  FabricacionVariantTreeItem,
} from "@/features/fabricacion/services/fabricacion-line-variant.service";

import s from "./fabricacion-workspace.module.css";

type FabricacionVariantTreeProps = {
  lineName: string;
  groups: FabricacionVariantTreeGroup[];
  selectedRecipeId?: string | null;
  onSelectRecipe?: (recipeId: string) => void;
  onCreateMissing?: (item: FabricacionVariantTreeItem) => void;
  isCreating?: boolean;
};

function statusIcon(item: FabricacionVariantTreeItem) {
  if (item.validated) return <CheckCircle2 size={14} aria-hidden />;
  if (item.calculable) return <CheckCircle2 size={14} aria-hidden />;
  if (item.recipe) return <AlertTriangle size={14} aria-hidden />;
  return <Circle size={14} aria-hidden />;
}

export function FabricacionVariantTree({
  lineName,
  groups,
  selectedRecipeId,
  onSelectRecipe,
  onCreateMissing,
  isCreating = false,
}: FabricacionVariantTreeProps) {
  if (groups.length === 0) return null;

  return (
    <section className={s.variantTree} aria-label={`Variantes de fabricación de ${lineName}`}>
      <header className={s.variantTreeHeader}>
        <strong>{lineName}</strong>
        <span>Configuraciones por tipología, hojas y variante</span>
      </header>

      <div className={s.variantTreeBody}>
        {groups.map((group) => (
          <div key={`${group.typology}:${group.leavesCount}`} className={s.variantTreeGroup}>
            <h3>{group.typologyLabel}</h3>
            <ul>
              {group.items.map((item) => {
                const recipeId = item.recipe?.id ?? null;
                const isSelected = Boolean(recipeId && recipeId === selectedRecipeId);
                return (
                  <li key={`${group.leavesCount}:${item.slot.variantSlug}`}>
                    <button
                      type="button"
                      className={s.variantTreeItem}
                      data-selected={isSelected ? "true" : "false"}
                      data-tone={
                        item.validated
                          ? "validated"
                          : item.calculable
                            ? "ready"
                            : item.recipe
                              ? "pending"
                              : "missing"
                      }
                      disabled={!recipeId && !onCreateMissing}
                      onClick={() => {
                        if (recipeId) {
                          onSelectRecipe?.(recipeId);
                          return;
                        }
                        onCreateMissing?.(item);
                      }}
                    >
                      <span className={s.variantTreeIcon}>{statusIcon(item)}</span>
                      <span className={s.variantTreeCopy}>
                        <strong>{item.label}</strong>
                        <small>{item.statusLabel}</small>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {isCreating ? <p className={s.variantTreeHint}>Preparando variante…</p> : null}
    </section>
  );
}
