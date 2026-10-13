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
import type { LineProfileReference } from "@/features/cotizaciones/line-templates/types/line-profile-references";

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
  catalogProfiles: LineProfileReference[];
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
  catalogProfiles,
  onPatch,
  onSetManufacturerCode,
  onAssignTallerPerfil,
  onRemove,
}: Props) {
  const pieceName = profile.funcion.trim() || `Perfil ${index + 1}`;
  const hasPendingBase = (profile.datosPendientes ?? []).some((detail) => /base de medida/i.test(detail));
  const hasPendingDiscount = (profile.datosPendientes ?? []).some((detail) => /descuento/i.test(detail));
  const hasPendingQuantity = (profile.datosPendientes ?? []).some((detail) => /cantidad por ventana/i.test(detail));
  const clearPending = (entry: FabricacionComponentePerfil, pattern: RegExp) => ({
    ...entry,
    datosPendientes: (entry.datosPendientes ?? []).filter((detail) => !pattern.test(detail)),
  });
  const clearPendingCommercialLength = (entry: FabricacionComponentePerfil) => {
    const datosPendientes = (entry.datosPendientes ?? []).filter(
      (detail) => !/largo comercial/i.test(detail)
    );
    return {
      ...entry,
      largoComercialPendiente: false,
      datosPendientes: datosPendientes.length ? datosPendientes : undefined,
    };
  };
  const baseLabel = hasPendingBase ? "Por definir" : labelBaseMedida(profile.reglaMedida.base, "human");
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
                  value={hasPendingBase ? "" : profile.reglaMedida.base}
                  disabled={readOnly}
                  onChange={(event) =>
                    onPatch(profile.id, (entry) => ({
                      ...clearPending(entry, /base de medida/i),
                      reglaMedida: {
                        ...entry.reglaMedida,
                        base: event.target.value as FabricacionBaseMedida,
                      },
                    }))
                  }
                >
                  {hasPendingBase ? <option value="" disabled>Elige una base</option> : null}
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
                  placeholder={hasPendingDiscount ? "Indica mm" : "0"}
                  disabled={readOnly}
                  onChange={(event) =>
                    onPatch(profile.id, (entry) => ({
                      ...clearPending(entry, event.target.value.trim() ? /descuento/i : /$^/),
                      reglaMedida: {
                        ...entry.reglaMedida,
                        ajusteMm:
                          event.target.value.trim() === ""
                            ? undefined
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
              {hasPendingQuantity ? (
                <button type="button" className={s.profileStepperButton} disabled={readOnly}
                  onClick={() => onPatch(profile.id, (entry) => ({
                    ...clearPending(entry, /cantidad por ventana/i),
                    reglaCantidad: { ...entry.reglaCantidad, cantidad: 1 },
                  }))}>
                  Definir cantidad
                </button>
              ) : (
                <ProfileQuantityStepper
                  value={profile.reglaCantidad.cantidad}
                  readOnly={readOnly}
                  onChange={(next) => onPatch(profile.id, (entry) => ({
                    ...entry,
                    reglaCantidad: { ...entry.reglaCantidad, cantidad: next },
                  }))}
                />
              )}
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
                    onPatch(profile.id, (entry) => {
                      const next = { ...entry, largoComercialMm: nextValue };
                      return nextValue == null
                        ? next
                        : clearPendingCommercialLength(next);
                    })
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
                  onPatch(profile.id, (entry) =>
                    clearPendingCommercialLength({
                      ...entry,
                      largoComercialMm: null,
                    })
                  )
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
              <span>Referencia de esta línea</span>
              <select
                value={profile.codigoPerfil}
                disabled={readOnly || catalogProfiles.length === 0}
                onChange={(event) => {
                  const reference = catalogProfiles.find(
                    (entry) => entry.code?.trim() === event.target.value
                  );
                  if (!reference) return;
                  onPatch(profile.id, (entry) => ({
                    ...entry,
                    codigoPerfil: reference.code?.trim() ?? "",
                    nombrePerfil: reference.name,
                    datosPendientes: (entry.datosPendientes ?? []).filter(
                      (detail) => !/confirmar codigo/i.test(detail)
                    ),
                  }));
                }}
              >
                <option value="">
                  {catalogProfiles.length > 0 ? "Elegir código del catálogo" : "Sin referencias documentadas"}
                </option>
                {catalogProfiles.map((reference, referenceIndex) => (
                  <option
                    key={`${reference.code}-${reference.name}-${referenceIndex}`}
                    value={reference.code?.trim() ?? ""}
                  >
                    {reference.role} · {reference.code?.trim()} · {reference.name}
                  </option>
                ))}
              </select>
              <small>Identifica la pieza. La medida y el descuento se completan con la pauta.</small>
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
