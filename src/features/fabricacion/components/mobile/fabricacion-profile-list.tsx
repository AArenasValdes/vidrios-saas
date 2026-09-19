"use client";

import { ChevronRight, Plus } from "lucide-react";

import {
  describePerfilCardDisplay,
  formatLargoComercialCorto,
  getActiveRecipeProfileRules,
  groupProfilesForSheet,
  profileTieneOverrideLargoComercial,
  resolveRecetaLargoComercialDefaultMm,
} from "@/features/fabricacion/services/fabricacion-regla-humana.service";
import type {
  FabricacionComponentePerfil,
  FabricacionReceta,
} from "@/features/fabricacion/types/fabricacion-domain";

import s from "./fabricacion-mobile.module.css";

type Props = {
  recipe: FabricacionReceta;
  readOnly?: boolean;
  onSelectProfile: (profileId: string) => void;
  onAddProfile?: () => void;
};

export function FabricacionProfileList({
  recipe,
  readOnly = false,
  onSelectProfile,
  onAddProfile,
}: Props) {
  const activeProfiles = getActiveRecipeProfileRules(recipe);
  const groups = groupProfilesForSheet(activeProfiles);
  const tiraEstandar =
    formatLargoComercialCorto(resolveRecetaLargoComercialDefaultMm(recipe)) ?? "6,00 m";

  return (
    <div className={s.stack}>
      <header className={s.stepSummaryHeader}>
        <p>
          {activeProfiles.length}{" "}
          {activeProfiles.length === 1 ? "perfil" : "perfiles"} · Tira estándar {tiraEstandar}
        </p>
        {!readOnly && onAddProfile ? (
          <button type="button" className={s.inlineAddAction} onClick={onAddProfile}>
            <Plus size={16} aria-hidden />
            Agregar perfil
          </button>
        ) : null}
      </header>

      {groups.length === 0 ? (
        <p className={s.emptyCopy}>
          Aún no hay perfiles activos. Agrega uno para definir cortes y largos.
        </p>
      ) : (
        groups.map((group) => (
          <section key={group.id} aria-labelledby={`profile-group-${group.id}`}>
            <h3 id={`profile-group-${group.id}`} className={s.groupSectionTitle}>
              {group.label} · {group.profiles.length}
            </h3>
            <ul className={s.groupList}>
              {group.profiles.map((profile, index) => (
                <ProfileRow
                  key={profile.id}
                  profile={profile}
                  recipe={recipe}
                  isLast={index === group.profiles.length - 1}
                  onSelect={() => onSelectProfile(profile.id)}
                />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

function ProfileRow({
  profile,
  recipe,
  isLast,
  onSelect,
}: {
  profile: FabricacionComponentePerfil;
  recipe: FabricacionReceta;
  isLast: boolean;
  onSelect: () => void;
}) {
  const card = describePerfilCardDisplay(profile, recipe);
  const hasSpecialLargo = profileTieneOverrideLargoComercial(profile);
  const perfilSecondary = buildPerfilSecondary(card.codigo, card.nombre);
  const metaParts = [`Base ${card.base}`, `Ajuste ${card.ajuste}`, `×${card.cantidad}`];
  if (hasSpecialLargo) {
    metaParts.push(`Tira ${card.largoComercial}`);
  }

  return (
    <li className={s.groupListItem} data-last={isLast ? "true" : "false"}>
      <button type="button" className={s.groupListRow} onClick={onSelect}>
        <div className={s.groupListRowMain}>
          <strong>{card.rol}</strong>
          {perfilSecondary ? <span className={s.groupListRowSecondary}>{perfilSecondary}</span> : null}
          <small className={s.groupListRowMeta}>{metaParts.join(" · ")}</small>
        </div>
        <ChevronRight size={18} aria-hidden className={s.groupListChevron} />
      </button>
    </li>
  );
}

function buildPerfilSecondary(codigo: string, nombre: string): string | null {
  const code = codigo.trim();
  const name = nombre.trim();
  if (code && name && code !== name) return `${code} · ${name}`;
  if (code && code !== "Pendiente de validar") return code;
  if (name) return name;
  return null;
}
