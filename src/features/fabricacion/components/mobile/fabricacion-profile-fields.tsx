"use client";

import { ChevronRight, Minus, Plus } from "lucide-react";

import { RecipeCommercialLengthPicker } from "@/features/fabricacion/components/recipe-commercial-length-picker";
import { RecipeProfileReferencePicker } from "@/features/fabricacion/components/recipe-profile-reference-picker";
import {
  FABRICACION_BASES_MEDIDA,
  type FabricacionBaseMedida,
  type FabricacionComponentePerfil,
  type FabricacionReceta,
} from "@/features/fabricacion/types/fabricacion-domain";
import {
  formatLargoComercialCorto,
  labelBaseMedida,
  profileTieneOverrideLargoComercial,
} from "@/features/fabricacion/services/fabricacion-regla-humana.service";
import type { TallerPerfilRef } from "@/features/fabricacion/services/taller-perfiles.service";

import s from "./fabricacion-mobile.module.css";

type Props = {
  profile: FabricacionComponentePerfil;
  recipe: FabricacionReceta;
  index: number;
  total: number;
  readOnly?: boolean;
  tiraEstandarLabel: string;
  frequentLargos: {
    usedByWorkshop: number[];
    otherFrequent: number[];
  };
  tallerPerfilCatalog: TallerPerfilRef[];
  plantillaSuggestedProfiles: TallerPerfilRef[];
  onPatch: (
    profileId: string,
    updater: (profile: FabricacionComponentePerfil) => FabricacionComponentePerfil
  ) => void;
  onSetManufacturerCode: (profileId: string, value: string) => void;
  onAssignTallerPerfil: (profileId: string, tallerPerfil: TallerPerfilRef) => void;
  onRemove?: (profileId: string) => void;
};

function ProfileQuantityStepper({
  value,
  readOnly,
  onChange,
}: {
  value: number;
  readOnly: boolean;
  onChange: (next: number) => void;
}) {
  const quantity = Math.max(1, Math.round(value));

  return (
    <div className={s.profileStepper} role="group" aria-label="Cantidad">
      <button
        type="button"
        className={s.profileStepperButton}
        disabled={readOnly || quantity <= 1}
        aria-label="Disminuir cantidad"
        onClick={() => onChange(Math.max(1, quantity - 1))}
      >
        <Minus size={18} aria-hidden />
      </button>
      <span className={s.profileStepperValue} aria-live="polite">
        {quantity}
      </span>
      <button
        type="button"
        className={s.profileStepperButton}
        disabled={readOnly}
        aria-label="Aumentar cantidad"
        onClick={() => onChange(quantity + 1)}
      >
        <Plus size={18} aria-hidden />
      </button>
    </div>
  );
}

export function FabricacionProfileFields({
  profile,
  recipe,
  index,
  readOnly = false,
  tiraEstandarLabel,
  frequentLargos,
  tallerPerfilCatalog,
  plantillaSuggestedProfiles,
  onPatch,
  onSetManufacturerCode,
  onAssignTallerPerfil,
  onRemove,
}: Props) {
  const pieceName = profile.funcion.trim() || `Perfil ${index + 1}`;
  const baseLabel = labelBaseMedida(profile.reglaMedida.base, "human");
  const largoLabel =
    formatLargoComercialCorto(profile.largoComercialMm) ??
    `Estándar (${tiraEstandarLabel})`;

  return (
    <div className={s.profileFieldsStack}>
      <section className={s.profileEditorSection} aria-labelledby="profile-config-title">
        <h3 id="profile-config-title" className={s.profileEditorSectionTitle}>
          Configuración
        </h3>
        <ul className={s.profileEditorList}>
          <li className={s.profileEditorListItem}>
            <label className={s.profileEditorPickerRow} htmlFor={`profile-base-${profile.id}`}>
              <span className={s.profileEditorRowLabel}>Base del cálculo</span>
              <span className={s.profileEditorPickerValue}>
                <select
                  id={`profile-base-${profile.id}`}
                  className={s.profileEditorSelect}
                  value={profile.reglaMedida.base}
                  disabled={readOnly}
                  onChange={(event) =>
                    onPatch(profile.id, (entry) => ({
                      ...entry,
                      reglaMedida: {
                        ...entry.reglaMedida,
                        base: event.target.value as FabricacionBaseMedida,
                      },
                    }))
                  }
                >
                  {FABRICACION_BASES_MEDIDA.map((base) => (
                    <option key={base} value={base}>
                      {labelBaseMedida(base, "human")}
                    </option>
                  ))}
                </select>
                <span className={s.profileEditorPickerDisplay}>{baseLabel}</span>
                <ChevronRight size={18} aria-hidden className={s.profileEditorChevron} />
              </span>
            </label>
            <p className={s.profileEditorRowHint}>
              Parte de la medida base de la ventana antes de aplicar descuentos.
            </p>
          </li>

          <li className={s.profileEditorListItem}>
            <div className={s.profileEditorInputRow}>
              <label className={s.profileEditorRowLabel} htmlFor={`profile-discount-${profile.id}`}>
                Descuento del taller
              </label>
              <div className={s.profileEditorNumberWrap}>
                <input
                  id={`profile-discount-${profile.id}`}
                  type="number"
                  inputMode="numeric"
                  className={s.profileEditorNumberInput}
                  value={profile.reglaMedida.ajusteMm == null ? "" : profile.reglaMedida.ajusteMm}
                  placeholder="0"
                  disabled={readOnly}
                  onChange={(event) =>
                    onPatch(profile.id, (entry) => ({
                      ...entry,
                      reglaMedida: {
                        ...entry.reglaMedida,
                        ajusteMm:
                          event.target.value.trim() === ""
                            ? 0
                            : Number.parseInt(event.target.value, 10),
                      },
                    }))
                  }
                />
                <span className={s.profileEditorUnit}>mm</span>
              </div>
            </div>
            <p className={s.profileEditorRowHint}>
              Suma o resta milímetros según cómo corta tu taller.
            </p>
          </li>

          <li className={s.profileEditorListItem} data-last="true">
            <div className={s.profileEditorInputRow}>
              <span className={s.profileEditorRowLabel}>Cantidad</span>
              <ProfileQuantityStepper
                value={profile.reglaCantidad.cantidad}
                readOnly={readOnly}
                onChange={(next) =>
                  onPatch(profile.id, (entry) => ({
                    ...entry,
                    reglaCantidad: {
                      ...entry.reglaCantidad,
                      cantidad: next,
                    },
                  }))
                }
              />
            </div>
            <p className={s.profileEditorRowHint}>Piezas que genera este perfil por ventana.</p>
          </li>
        </ul>
      </section>

      <section className={s.profileEditorSection} aria-labelledby="profile-optional-title">
        <h3 id="profile-optional-title" className={s.profileEditorSectionTitle}>
          Opcionales
        </h3>
        <ul className={s.profileEditorList}>
          <li className={s.profileEditorListItem} data-last="true">
            <div className={s.profileEditorLengthRow}>
              <div className={s.profileEditorLengthCopy}>
                <span className={s.profileEditorRowLabel}>Largo especial</span>
                <span className={s.profileEditorRowMeta}>{largoLabel}</span>
              </div>
              <div className={s.profileEditorLengthPicker}>
                <RecipeCommercialLengthPicker
                  value={profile.largoComercialMm}
                  usedByWorkshop={frequentLargos.usedByWorkshop}
                  otherFrequent={frequentLargos.otherFrequent}
                  readOnly={readOnly}
                  emptyLabel="Ej. 5,80 m"
                  showUnitSuffix={false}
                  onChange={(nextValue) =>
                    onPatch(profile.id, (entry) => ({
                      ...entry,
                      largoComercialMm: nextValue,
                    }))
                  }
                />
                <ChevronRight size={18} aria-hidden className={s.profileEditorChevron} />
              </div>
            </div>
            <p className={s.profileEditorRowHint}>
              Si no defines uno, Ventora usa la tira estándar ({tiraEstandarLabel}).
            </p>
            {!readOnly && profileTieneOverrideLargoComercial(profile) ? (
              <button
                type="button"
                className={s.profileEditorTextAction}
                onClick={() =>
                  onPatch(profile.id, (entry) => ({
                    ...entry,
                    largoComercialMm: null,
                  }))
                }
              >
                Usar tira estándar
              </button>
            ) : null}
          </li>
        </ul>
      </section>

      <section className={s.profileEditorSection} aria-labelledby="profile-advanced-title">
        <details className={s.profileEditorDisclosure}>
          <summary className={s.profileEditorDisclosureSummary}>
            <span id="profile-advanced-title">Identificar perfil y opciones avanzadas</span>
            <ChevronRight size={18} aria-hidden className={s.profileEditorDisclosureChevron} />
          </summary>
          <div className={s.profileEditorDisclosureBody}>
            <label className={s.profileEditorField}>
              <span>Función</span>
              <input
                value={profile.funcion}
                placeholder={pieceName}
                disabled={readOnly}
                autoComplete="off"
                onChange={(event) =>
                  onPatch(profile.id, (entry) => ({
                    ...entry,
                    funcion: event.target.value,
                  }))
                }
              />
            </label>
            <label className={s.profileEditorField}>
              <span>Nombre usado en taller</span>
              <input
                value={profile.nombrePerfil}
                placeholder="Opcional"
                disabled={readOnly}
                autoComplete="off"
                onChange={(event) =>
                  onPatch(profile.id, (entry) => ({
                    ...entry,
                    nombrePerfil: event.target.value,
                  }))
                }
              />
            </label>
            <label className={s.profileEditorField}>
              <span>Código de fabricante</span>
              <input
                value={profile.codigoPerfil}
                placeholder="Ej. 2001"
                inputMode="text"
                autoComplete="off"
                disabled={readOnly}
                onChange={(event) => onSetManufacturerCode(profile.id, event.target.value)}
              />
            </label>
            <RecipeProfileReferencePicker
              profile={profile}
              recipe={recipe}
              catalog={tallerPerfilCatalog}
              suggestedProfiles={plantillaSuggestedProfiles}
              readOnly={readOnly}
              onSelect={(tallerPerfil) => onAssignTallerPerfil(profile.id, tallerPerfil)}
            />
          </div>
        </details>
      </section>

      {!readOnly && onRemove ? (
        <button type="button" className={s.profileEditorDestructiveAction} onClick={() => onRemove(profile.id)}>
          Eliminar perfil
        </button>
      ) : null}
    </div>
  );
}
