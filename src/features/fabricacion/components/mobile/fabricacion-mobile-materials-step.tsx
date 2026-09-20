"use client";

import { useMemo } from "react";
import { ChevronRight, Plus } from "lucide-react";

import {
  describeRecipeGlassListRow,
  labelReglaCantidadTipo,
} from "@/features/fabricacion/services/fabricacion-regla-humana.service";
import type {
  FabricacionAccesorio,
  FabricacionReceta,
  FabricacionRolAccesorio,
} from "@/features/fabricacion/types/fabricacion-domain";

import s from "./fabricacion-mobile.module.css";

type Props = {
  draft: FabricacionReceta;
  readOnly?: boolean;
  onAddGlass: () => void;
  onAddAccessory: () => void;
  onSelectGlass: (id: string) => void;
  onSelectAccessory: (id: string) => void;
};

const ACCESSORY_ROLE_LABELS: Record<FabricacionRolAccesorio, string> = {
  hardware: "Herrajes",
  consumable: "Consumibles",
  seal: "Sellos",
  fastener: "Fijaciones",
  installation: "Instalación",
  machining: "Mecanizado",
  other: "Otros",
};

export function FabricacionMobileMaterialsStep({
  draft,
  readOnly = false,
  onAddGlass,
  onAddAccessory,
  onSelectGlass,
  onSelectAccessory,
}: Props) {
  const accessoryGroups = useMemo(
    () => groupAccessoriesByRole(draft.accesorios),
    [draft.accesorios]
  );

  return (
    <div className={s.stack}>
      <section aria-labelledby="materials-glass-title">
        <header className={s.stepSummaryHeader}>
          <h2 id="materials-glass-title" className={s.groupSectionTitleInline}>
            Vidrio · {draft.vidrios.length}
          </h2>
          {!readOnly ? (
            <button type="button" className={s.inlineAddAction} onClick={onAddGlass}>
              <Plus size={16} aria-hidden />
              Agregar
            </button>
          ) : null}
        </header>
        {draft.vidrios.length === 0 ? (
          <p className={s.emptyCopy}>
            Sin vidrio definido. Puedes agregarlo ahora o al cotizar cada pieza.
          </p>
        ) : (
          <ul className={s.groupList}>
            {draft.vidrios.map((glass, index) => {
              const display = describeRecipeGlassListRow(glass);
              return (
              <li
                key={glass.id}
                className={s.groupListItem}
                data-last={index === draft.vidrios.length - 1 ? "true" : "false"}
              >
                <button
                  type="button"
                  className={s.groupListRow}
                  onClick={() => onSelectGlass(glass.id)}
                >
                  <div
                    className={s.groupListRowMain}
                    data-type-pending={display.typePending ? "true" : "false"}
                  >
                    <strong>{display.title}</strong>
                    <span className={s.groupListRowSecondary}>{display.secondary}</span>
                  </div>
                  <div className={s.groupListRowTrailing}>
                    <span className={s.groupListQuantity}>
                      {Math.max(1, Math.round(glass.reglaCantidad.cantidad))}
                    </span>
                    <ChevronRight size={18} aria-hidden className={s.groupListChevron} />
                  </div>
                </button>
              </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="materials-accessories-title">
        <header className={s.stepSummaryHeader}>
          <h2 id="materials-accessories-title" className={s.groupSectionTitleInline}>
            Accesorios · {draft.accesorios.length}
          </h2>
          {!readOnly ? (
            <button type="button" className={s.inlineAddAction} onClick={onAddAccessory}>
              <Plus size={16} aria-hidden />
              Agregar
            </button>
          ) : null}
        </header>
        {draft.accesorios.length === 0 ? (
          <p className={s.emptyCopy}>Sin accesorios</p>
        ) : (
          accessoryGroups.map((group) => (
            <div key={group.id} className={s.accessoryGroup}>
              {accessoryGroups.length > 1 ? (
                <h3 className={s.groupSectionTitle}>{group.label}</h3>
              ) : null}
              <ul className={s.groupList}>
                {group.items.map((accessory, index) => {
                  const secondary = describeAccessorySecondary(accessory);
                  return (
                    <li
                      key={accessory.id}
                      className={s.groupListItem}
                      data-last={index === group.items.length - 1 ? "true" : "false"}
                    >
                      <button
                        type="button"
                        className={s.groupListRow}
                        onClick={() => onSelectAccessory(accessory.id)}
                      >
                        <div className={s.groupListRowMain}>
                          <strong>{resolveAccessoryTitle(accessory)}</strong>
                          {secondary ? (
                            <span className={s.groupListRowSecondary}>{secondary}</span>
                          ) : null}
                        </div>
                        <div className={s.groupListRowTrailing}>
                          <span className={s.groupListQuantity}>
                            {Math.max(1, Math.round(accessory.reglaCantidad.cantidad))}
                          </span>
                          <ChevronRight size={18} aria-hidden className={s.groupListChevron} />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

function resolveAccessoryTitle(accessory: FabricacionAccesorio): string {
  return accessory.nombre.trim() || accessory.codigo.trim() || "Accesorio";
}

function describeAccessorySecondary(accessory: FabricacionAccesorio): string | null {
  const codigo = accessory.codigo.trim();
  const nombre = accessory.nombre.trim();
  if (codigo && codigo !== nombre) return codigo;
  const scope = labelReglaCantidadTipo(accessory.reglaCantidad.tipo, "human");
  return scope || null;
}

function groupAccessoriesByRole(accessories: FabricacionAccesorio[]) {
  const hasRoles = accessories.some((entry) => entry.clasificacion?.rol);
  if (!hasRoles) {
    return [{ id: "all", label: "Accesorios", items: accessories }];
  }

  const groups = new Map<FabricacionRolAccesorio, FabricacionAccesorio[]>();
  for (const accessory of accessories) {
    const role = accessory.clasificacion?.rol ?? "other";
    const current = groups.get(role) ?? [];
    current.push(accessory);
    groups.set(role, current);
  }

  return Array.from(groups.entries()).map(([role, items]) => ({
    id: role,
    label: ACCESSORY_ROLE_LABELS[role],
    items,
  }));
}
