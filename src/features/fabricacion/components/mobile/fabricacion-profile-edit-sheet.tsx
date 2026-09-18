"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";

import { FabricacionProfileFields } from "@/features/fabricacion/components/mobile/fabricacion-profile-fields";
import {
  buildPlantillaSuggestedPerfilRefs,
  resolvePlantillaVentoraIdForRecipe,
} from "@/features/fabricacion/services/fabricacion-receta-codigos.service";
import { patchFabricacionPerfil } from "@/features/fabricacion/services/fabricacion-receta-editor.service";
import {
  formatLargoComercialCorto,
  resolveRecetaLargoComercialDefaultMm,
} from "@/features/fabricacion/services/fabricacion-regla-humana.service";
import {
  applyTallerPerfilToComponent,
  collectFrequentLargosMm,
  collectTallerPerfilesFromRecipes,
  mergeTallerPerfilCatalogs,
  readStoredTallerPerfiles,
} from "@/features/fabricacion/services/taller-perfiles.service";
import type {
  FabricacionComponentePerfil,
  FabricacionReceta,
} from "@/features/fabricacion/types/fabricacion-domain";
import type { FabricationRecipeSourceType } from "@/features/fabricacion/types/fabricacion-persistence";

import s from "./fabricacion-mobile.module.css";

type Props = {
  recipe: FabricacionReceta;
  profileId: string;
  sourceType: FabricationRecipeSourceType;
  sourceReference: string | null;
  lineName: string;
  workshopRecipes: FabricacionReceta[];
  readOnly?: boolean;
  onClose: () => void;
  onRecipeChange: (recipe: FabricacionReceta) => void;
  onPersist: (recipe: FabricacionReceta) => Promise<void>;
};

export function FabricacionProfileEditSheet({
  recipe,
  profileId,
  sourceType,
  sourceReference,
  lineName,
  workshopRecipes,
  readOnly = false,
  onClose,
  onRecipeChange,
  onPersist,
}: Props) {
  const [isSaving, setIsSaving] = useState(false);
  const orderedProfiles = useMemo(
    () => recipe.perfiles,
    [recipe.perfiles]
  );
  const index = orderedProfiles.findIndex((profile) => profile.id === profileId);
  const profile = index >= 0 ? orderedProfiles[index] : null;
  const tallerPerfilCatalog = useMemo(
    () =>
      mergeTallerPerfilCatalogs(
        readStoredTallerPerfiles(),
        collectTallerPerfilesFromRecipes(workshopRecipes)
      ),
    [workshopRecipes]
  );
  const plantillaSuggestedProfiles = useMemo(() => {
    const plantillaId = resolvePlantillaVentoraIdForRecipe({
      sourceType,
      sourceReference,
      lineName,
      receta: recipe,
    });
    return plantillaId ? buildPlantillaSuggestedPerfilRefs(plantillaId) : [];
  }, [lineName, recipe, sourceReference, sourceType]);
  const frequentLargos = useMemo(
    () => collectFrequentLargosMm(workshopRecipes),
    [workshopRecipes]
  );
  const tiraEstandarLabel =
    formatLargoComercialCorto(resolveRecetaLargoComercialDefaultMm(recipe)) ??
    "6,00 m";

  if (!profile) return null;

  const patchProfile = (
    targetId: string,
    updater: (entry: FabricacionComponentePerfil) => FabricacionComponentePerfil
  ) => {
    onRecipeChange(patchFabricacionPerfil(recipe, targetId, updater));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onPersist(recipe);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={s.sheetBackdrop} role="presentation" onClick={onClose}>
      <section
        className={s.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={`Editar ${profile.funcion}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={s.sheetHeader}>
          <div>
            <h2>{profile.funcion.trim() || "Perfil"}</h2>
            <p>Cambia solo si tu taller lo corta distinto</p>
          </div>
          <button type="button" className={s.backButton} onClick={onClose} aria-label="Cerrar">
            <X size={18} aria-hidden />
          </button>
        </header>

        <FabricacionProfileFields
          profile={profile}
          recipe={recipe}
          index={index}
          total={orderedProfiles.length}
          readOnly={readOnly}
          tiraEstandarLabel={tiraEstandarLabel}
          frequentLargos={frequentLargos}
          tallerPerfilCatalog={tallerPerfilCatalog}
          plantillaSuggestedProfiles={plantillaSuggestedProfiles}
          onPatch={patchProfile}
          onSetManufacturerCode={(targetId, value) =>
            patchProfile(targetId, (entry) => {
              const pending = (entry.datosPendientes ?? []).filter(
                (detail) => !/confirmar codigo/i.test(detail)
              );
              return {
                ...entry,
                codigoPerfil: value,
                datosPendientes: pending.length > 0 ? pending : undefined,
              };
            })
          }
          onAssignTallerPerfil={(targetId, tallerPerfil) =>
            patchProfile(targetId, (entry) =>
              applyTallerPerfilToComponent(entry, tallerPerfil, {
                prefillLargo: true,
              })
            )
          }
        />

        <footer className={s.sheetFooter}>
          <button type="button" className={s.secondaryButton} onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className={s.primaryButton}
            disabled={readOnly || isSaving}
            onClick={() => void handleSave()}
          >
            {isSaving ? "Guardando..." : "Guardar"}
          </button>
        </footer>
      </section>
    </div>
  );
}
