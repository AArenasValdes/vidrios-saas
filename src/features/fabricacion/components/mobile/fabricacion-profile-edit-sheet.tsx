"use client";

import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";

import { FabricacionProfileFields } from "@/features/fabricacion/components/mobile/fabricacion-profile-fields";
import {
  buildPlantillaSuggestedPerfilRefs,
  resolvePlantillaVentoraIdForRecipe,
} from "@/features/fabricacion/services/fabricacion-receta-codigos.service";
import { patchFabricacionPerfil } from "@/features/fabricacion/services/fabricacion-receta-editor.service";
import {
  describePerfilCardDisplay,
  formatLargoComercialCorto,
  profileTieneOverrideLargoComercial,
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
import { useMobileSheetChrome } from "./use-mobile-sheet-chrome";

type Props = {
  recipe: FabricacionReceta;
  profileId: string;
  profileIds: string[];
  sourceType: FabricationRecipeSourceType;
  sourceReference: string | null;
  lineName: string;
  workshopRecipes: FabricacionReceta[];
  readOnly?: boolean;
  onClose: () => void;
  onSelectProfile: (profileId: string) => void;
  onRecipeChange: (recipe: FabricacionReceta) => void;
  onPersist: (recipe: FabricacionReceta) => Promise<void>;
};

function ProfilePreviewHero({
  preview,
  profile,
  recipe,
  tiraEstandarLabel,
}: {
  preview: ReturnType<typeof describePerfilCardDisplay>;
  profile: FabricacionComponentePerfil;
  recipe: FabricacionReceta;
  tiraEstandarLabel: string;
}) {
  const perfilCode = preview.codigo !== "Pendiente de validar" ? preview.codigo : "";
  const perfilName = preview.nombre.trim();
  const perfilLine = [perfilCode, perfilName].filter(Boolean).join(" · ");
  const largoLine = profileTieneOverrideLargoComercial(profile)
    ? preview.largoComercial
    : tiraEstandarLabel;

  return (
    <article className={s.profilePreviewHero} aria-label="Vista previa del corte">
      <p className={s.profilePreviewLabel}>Así quedará el corte</p>
      <strong className={s.profilePreviewTitle}>{preview.rol}</strong>
      {perfilLine ? <p className={s.profilePreviewSubtitle}>{perfilLine}</p> : null}
      <dl className={s.profilePreviewFacts}>
        <div>
          <dt>Base</dt>
          <dd>{preview.base}</dd>
        </div>
        <div>
          <dt>Ajuste</dt>
          <dd>{preview.ajuste}</dd>
        </div>
        <div>
          <dt>Cantidad</dt>
          <dd>×{preview.cantidad}</dd>
        </div>
        <div>
          <dt>Largo</dt>
          <dd>{largoLine}</dd>
        </div>
      </dl>
      <p className={s.profilePreviewHint}>
        Ajusta el descuento solo si tu taller corta distinto a la pauta Ventora.
      </p>
    </article>
  );
}

export function FabricacionProfileEditSheet({
  recipe,
  profileId,
  profileIds,
  sourceType,
  sourceReference,
  lineName,
  workshopRecipes,
  readOnly = false,
  onClose,
  onSelectProfile,
  onRecipeChange,
  onPersist,
}: Props) {
  useMobileSheetChrome(onClose);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveFlash, setSaveFlash] = useState(false);
  const orderedProfiles = useMemo(() => recipe.perfiles, [recipe.perfiles]);
  const index = orderedProfiles.findIndex((profile) => profile.id === profileId);
  const profile = index >= 0 ? orderedProfiles[index] : null;
  const activeIndex = profileIds.findIndex((id) => id === profileId);
  const nextProfileId =
    activeIndex >= 0 && activeIndex < profileIds.length - 1
      ? profileIds[activeIndex + 1]
      : null;
  const preview = profile ? describePerfilCardDisplay(profile, recipe) : null;
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

  if (!profile || !preview) return null;

  const patchProfile = (
    targetId: string,
    updater: (entry: FabricacionComponentePerfil) => FabricacionComponentePerfil
  ) => {
    setSaveError(null);
    onRecipeChange(patchFabricacionPerfil(recipe, targetId, updater));
  };

  const persist = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await onPersist(recipe);
      return true;
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "No se pudo guardar este perfil. Intenta de nuevo."
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const flashAnd = (action: () => void) => {
    setSaveFlash(true);
    window.setTimeout(() => {
      setSaveFlash(false);
      action();
    }, 420);
  };

  const handleSave = async () => {
    const saved = await persist();
    if (saved) flashAnd(onClose);
  };

  const handleSaveAndNext = async () => {
    const targetNextId = nextProfileId;
    const saved = await persist();
    if (!saved) return;
    if (targetNextId) {
      setSaveFlash(true);
      onSelectProfile(targetNextId);
      window.setTimeout(() => setSaveFlash(false), 420);
      return;
    }
    flashAnd(onClose);
  };

  const progressPct =
    profileIds.length > 0
      ? Math.round(((activeIndex >= 0 ? activeIndex + 1 : index + 1) / profileIds.length) * 100)
      : 0;
  const pieceNumber = activeIndex >= 0 ? activeIndex + 1 : index + 1;
  const pieceTotal = profileIds.length || orderedProfiles.length;

  return (
    <div
      className={s.sheetBackdrop}
      role="presentation"
      onClick={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <section
        className={`${s.sheet} ${s.profileSheet}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fabricacion-profile-sheet-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={s.sheetHandle} aria-hidden="true" />

        <header className={s.profileSheetHeader}>
          <button type="button" className={s.textButton} onClick={onClose}>
            Cancelar
          </button>
          <div className={s.profileSheetHeading}>
            <p className={s.profileSheetEyebrow}>Perfil · Pieza {pieceNumber}</p>
            <h2 id="fabricacion-profile-sheet-title">
              {profile.funcion.trim() || "Perfil"}
            </h2>
          </div>
          <span className={s.profileSheetCounter} aria-label={`Perfil ${pieceNumber} de ${pieceTotal}`}>
            {pieceNumber}/{pieceTotal}
          </span>
        </header>

        <div
          className={s.profileSheetProgress}
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Perfil ${pieceNumber} de ${pieceTotal}`}
        >
          <span style={{ width: `${progressPct}%` }} />
        </div>

        <div className={s.profileSheetScroll}>
          <ProfilePreviewHero
            preview={preview}
            profile={profile}
            recipe={recipe}
            tiraEstandarLabel={tiraEstandarLabel}
          />

          {saveFlash ? (
            <div className={s.saveFlash} role="status">
              Perfil guardado
            </div>
          ) : null}

          {saveError ? (
            <div className={s.errorBand} role="alert">
              {saveError}
            </div>
          ) : null}

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
        </div>

        <footer className={s.profileSheetFooter}>
          <button
            type="button"
            className={s.profileSheetSecondaryAction}
            disabled={readOnly || isSaving}
            onClick={() => void handleSave()}
          >
            {isSaving ? "Guardando…" : "Guardar"}
          </button>
          <button
            type="button"
            className={s.primaryButton}
            disabled={readOnly || isSaving}
            onClick={() => void handleSaveAndNext()}
          >
            {isSaving
              ? "Guardando…"
              : nextProfileId
                ? "Guardar y siguiente"
                : "Guardar y cerrar"}
            {!isSaving ? <ArrowRight size={16} aria-hidden /> : null}
          </button>
        </footer>
      </section>
    </div>
  );
}
