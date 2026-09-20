"use client";

import { AlertTriangle, CheckCircle2, ChevronRight, Circle } from "lucide-react";

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
  compactHeader?: boolean;
};

function statusIcon(item: FabricacionVariantTreeItem) {
  if (item.validated) return <CheckCircle2 size={16} aria-hidden />;
  if (item.calculable || item.compositionComplete) {
    return <CheckCircle2 size={16} aria-hidden />;
  }
  if (item.recipe) return <AlertTriangle size={16} aria-hidden />;
  return <Circle size={16} aria-hidden />;
}

function resolveVariantActionLabel(item: FabricacionVariantTreeItem): string {
  if (!item.recipe) return "Crear";
  if (item.validated) return "Ver";
  if (item.calculable && item.compositionComplete) return "Revisar";
  if (item.recipe.definition.perfiles.length > 0) return "Revisar";
  return "Continuar";
}

export function FabricacionVariantTree({
  lineName,
  groups,
  selectedRecipeId,
  onSelectRecipe,
  onCreateMissing,
  isCreating = false,
  compactHeader = false,
}: FabricacionVariantTreeProps) {
  if (groups.length === 0) return null;

  return (
    <section className={s.variantTree} aria-label={`Variantes de fabricación de ${lineName}`}>
      <header className={s.variantTreeHeader}>
        {compactHeader ? (
          <>
            <strong>Construcciones del taller</strong>
            <span>Toca una variante para revisarla o crearla</span>
          </>
        ) : (
          <>
            <strong>{lineName}</strong>
            <span>Configuraciones por categoría, hojas y variante</span>
          </>
        )}
      </header>

      <div className={s.variantTreeBody}>
        {groups.map((group) => (
          <div
            key={`${group.typology}:${group.leavesCount}:${group.apertura ?? "default"}`}
            className={s.variantTreeGroup}
          >
            <h3>{group.typologyLabel}</h3>
            <ul>
              {group.items.map((item) => {
                const recipeId = item.recipe?.id ?? null;
                const isSelected = Boolean(recipeId && recipeId === selectedRecipeId);
                const actionLabel = resolveVariantActionLabel(item);
                const isDisabled = isCreating || (!recipeId && !onCreateMissing);

                return (
                  <li key={`${group.leavesCount}:${item.slot.variantSlug}`}>
                    <button
                      type="button"
                      className={s.variantTreeItem}
                      data-selected={isSelected ? "true" : "false"}
                      data-tone={
                        item.validated
                          ? "validated"
                          : item.calculable || item.compositionComplete
                            ? "ready"
                            : item.recipe
                              ? "pending"
                              : "missing"
                      }
                      disabled={isDisabled}
                      aria-label={`${item.label}. ${item.statusLabel}. ${actionLabel}.`}
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
                      <span className={s.variantTreeAction}>
                        <small>{actionLabel}</small>
                        <ChevronRight size={16} aria-hidden />
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
