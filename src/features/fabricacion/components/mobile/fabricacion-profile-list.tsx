"use client";

import { ChevronRight } from "lucide-react";

import { describeCodigoPerfilEstructural } from "@/features/fabricacion/fixtures/arquetipos-estructurales-lineas";
import {
  describePerfilTallerResumen,
  groupProfilesForSheet,
} from "@/features/fabricacion/services/fabricacion-regla-humana.service";
import type { FabricacionComponentePerfil } from "@/features/fabricacion/types/fabricacion-domain";

import s from "./fabricacion-mobile.module.css";

type Props = {
  profiles: FabricacionComponentePerfil[];
  onSelectProfile: (profileId: string) => void;
};

export function FabricacionProfileList({ profiles, onSelectProfile }: Props) {
  const groups = groupProfilesForSheet(profiles);

  if (groups.length === 0) {
    return (
      <div className={s.card}>
        <p>Aún no hay perfiles en esta receta. Continúa desde el paso de configuración.</p>
      </div>
    );
  }

  return (
    <div>
      {groups.map((group) => (
        <section key={group.id} className={s.profileGroup}>
          <h3>{group.label}</h3>
          {group.profiles.map((profile) => {
            const code = describeCodigoPerfilEstructural(profile.codigoPerfil);
            const detail = describePerfilTallerResumen(profile);
            return (
              <button
                key={profile.id}
                type="button"
                className={s.profileRow}
                onClick={() => onSelectProfile(profile.id)}
              >
                <div>
                  <strong>{profile.funcion.trim() || "Perfil"}</strong>
                  <small>
                    {code}
                    {detail ? ` · ${detail}` : ""}
                  </small>
                </div>
                <ChevronRight size={18} aria-hidden />
              </button>
            );
          })}
        </section>
      ))}
    </div>
  );
}
