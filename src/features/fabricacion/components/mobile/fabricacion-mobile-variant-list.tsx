"use client";

import type {
  FabricacionVariantTreeGroup,
  FabricacionVariantTreeItem,
} from "@/features/fabricacion/services/fabricacion-line-variant.service";

import s from "./fabricacion-mobile.module.css";

type Props = {
  groups: FabricacionVariantTreeGroup[];
  selectedRecipeId?: string | null;
  onSelectRecipe?: (recipeId: string) => void;
  onOpenRecipe?: (recipeId: string) => void;
  onTestRecipe?: (recipeId: string) => void;
  onCreateMissing?: (item: FabricacionVariantTreeItem) => void;
  isCreating?: boolean;
};

export function FabricacionMobileVariantList({
  groups,
  selectedRecipeId = null,
  onSelectRecipe,
  onOpenRecipe,
  onTestRecipe,
  onCreateMissing,
  isCreating = false,
}: Props) {
  if (groups.length === 0) return null;

  return (
    <div className={s.variantGallery}>
      {groups.map((group) => (
        <section
          key={`${group.typology}:${group.leavesCount}:${group.apertura ?? "default"}`}
          className={s.variantGalleryGroup}
          aria-label={group.typologyLabel}
        >
          <h3 className={s.variantGalleryGroupTitle}>{group.typologyLabel}</h3>
          <ul className={s.variantGalleryList}>
            {group.items.map((item) => {
              const recipeId = item.recipe?.id ?? null;
              const isSelected = Boolean(recipeId && recipeId === selectedRecipeId);
              const hasRecipe = Boolean(recipeId);

              return (
                <li
                  key={`${group.leavesCount}:${item.slot.variantSlug}`}
                  className={s.variantGalleryItem}
                  data-selected={isSelected ? "true" : "false"}
                  data-ready={item.calculable || item.compositionComplete ? "true" : "false"}
                >
                  <button
                    type="button"
                    className={s.variantGallerySelect}
                    disabled={!hasRecipe || isCreating}
                    onClick={() => {
                      if (recipeId) onSelectRecipe?.(recipeId);
                    }}
                  >
                    <span className={s.variantGalleryCopy}>
                      <strong>{item.label}</strong>
                      <small>{item.statusLabel}</small>
                    </span>
                  </button>
                  <div
                    className={s.variantGalleryActions}
                    data-single-action={hasRecipe ? "false" : "true"}
                  >
                    {hasRecipe ? (
                      <>
                        <button
                          type="button"
                          className={s.variantGalleryActionPrimary}
                          disabled={isCreating}
                          onClick={() => onOpenRecipe?.(recipeId!)}
                        >
                          Revisar
                        </button>
                        <button
                          type="button"
                          className={s.variantGalleryActionSecondary}
                          disabled={isCreating}
                          onClick={() => onTestRecipe?.(recipeId!)}
                        >
                          Probar
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className={s.variantGalleryActionPrimary}
                        disabled={isCreating || !onCreateMissing}
                        onClick={() => onCreateMissing?.(item)}
                      >
                        Crear
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {isCreating ? <p className={s.hint}>Preparando variante…</p> : null}
    </div>
  );
}
