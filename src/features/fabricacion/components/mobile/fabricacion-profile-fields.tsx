"use client";

import { RecipeCommercialLengthPicker } from "@/features/fabricacion/components/recipe-commercial-length-picker";
import { RecipeProfileReferencePicker } from "@/features/fabricacion/components/recipe-profile-reference-picker";
import {
  FABRICACION_BASES_MEDIDA,
  type FabricacionBaseMedida,
  type FabricacionComponentePerfil,
  type FabricacionReceta,
} from "@/features/fabricacion/types/fabricacion-domain";
import {
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

function positiveNumber(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function FabricacionProfileFields({
  profile,
  recipe,
  index,
  total,
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

  return (
    <div className={s.sheetSection}>
      <p>
        Pieza {index + 1} de {total}
      </p>

      <section className={s.sheetSection}>
        <h3>Medida de corte</h3>
        <label>
          <span>Medida</span>
          <select
            value={profile.reglaMedida.base}
            onChange={(event) =>
              onPatch(profile.id, (entry) => ({
                ...entry,
                reglaMedida: {
                  ...entry.reglaMedida,
                  base: event.target.value as FabricacionBaseMedida,
                },
              }))
            }
            disabled={readOnly}
          >
            {FABRICACION_BASES_MEDIDA.map((base) => (
              <option key={base} value={base}>
                {labelBaseMedida(base, "human")}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Descuento (mm)</span>
          <input
            type="number"
            value={profile.reglaMedida.ajusteMm == null ? "" : profile.reglaMedida.ajusteMm}
            placeholder="0"
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
            disabled={readOnly}
          />
        </label>
      </section>

      <section className={s.sheetSection}>
        <h3>Largo especial (opcional)</h3>
        <RecipeCommercialLengthPicker
          value={profile.largoComercialMm}
          usedByWorkshop={frequentLargos.usedByWorkshop}
          otherFrequent={frequentLargos.otherFrequent}
          readOnly={readOnly}
          onChange={(nextValue) =>
            onPatch(profile.id, (entry) => ({
              ...entry,
              largoComercialMm: nextValue,
            }))
          }
        />
        <p>
          Si no defines uno, Ventora usa la tira estándar ({tiraEstandarLabel}).
        </p>
        {!readOnly && profileTieneOverrideLargoComercial(profile) ? (
          <button
            type="button"
            className={s.secondaryButton}
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
      </section>

      <section className={s.sheetSection}>
        <h3>Cantidad</h3>
        <label>
          <span>Cantidad de piezas</span>
          <input
            type="number"
            min="1"
            value={profile.reglaCantidad.cantidad}
            onChange={(event) =>
              onPatch(profile.id, (entry) => ({
                ...entry,
                reglaCantidad: {
                  ...entry.reglaCantidad,
                  cantidad: positiveNumber(event.target.value),
                },
              }))
            }
            disabled={readOnly}
          />
        </label>
      </section>

      <section className={s.sheetSection}>
        <h3>Identificar perfil (opcional)</h3>
        <label>
          <span>Función</span>
          <input
            value={profile.funcion}
            placeholder={pieceName}
            onChange={(event) =>
              onPatch(profile.id, (entry) => ({
                ...entry,
                funcion: event.target.value,
              }))
            }
            disabled={readOnly}
          />
        </label>
        <label>
          <span>Nombre usado en taller</span>
          <input
            value={profile.nombrePerfil}
            placeholder="Opcional"
            onChange={(event) =>
              onPatch(profile.id, (entry) => ({
                ...entry,
                nombrePerfil: event.target.value,
              }))
            }
            disabled={readOnly}
          />
        </label>
        <label>
          <span>Código de fabricante</span>
          <input
            value={profile.codigoPerfil}
            placeholder="Ej. 2001"
            onChange={(event) => onSetManufacturerCode(profile.id, event.target.value)}
            disabled={readOnly}
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
      </section>

      {!readOnly && onRemove ? (
        <button
          type="button"
          className={s.secondaryButton}
          onClick={() => onRemove(profile.id)}
        >
          Eliminar perfil
        </button>
      ) : null}
    </div>
  );
}
