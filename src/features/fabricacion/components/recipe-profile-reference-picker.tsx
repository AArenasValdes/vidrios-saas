"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";

import type {
  FabricacionComponentePerfil,
  FabricacionReceta,
} from "@/features/fabricacion/types/fabricacion-domain";
import {
  createTallerPerfilRef,
  profileReferenceLabel,
  splitTallerPerfilCatalog,
  type TallerPerfilRef,
  upsertStoredTallerPerfil,
} from "@/features/fabricacion/services/taller-perfiles.service";

import s from "./fabricacion-workspace.module.css";

type Props = {
  profile: FabricacionComponentePerfil;
  recipe: FabricacionReceta;
  catalog: TallerPerfilRef[];
  readOnly?: boolean;
  onSelect: (perfil: TallerPerfilRef) => void;
};

export function RecipeProfileReferencePicker({
  profile,
  recipe,
  catalog,
  readOnly = false,
  onSelect,
}: Props) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"list" | "create">("list");
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [largo, setLargo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const label = profileReferenceLabel(profile) || "Por asignar";
  const { recent, others } = useMemo(
    () => splitTallerPerfilCatalog({ catalog, recipe }),
    [catalog, recipe]
  );

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setMode("list");
        setError(null);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setMode("list");
        setError(null);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleCreate = () => {
    try {
      const created = createTallerPerfilRef({
        nombre,
        codigoComercial: codigo,
        largoComercialMm: largo.trim() ? Number(largo) : null,
      });
      upsertStoredTallerPerfil(created);
      onSelect(created);
      setOpen(false);
      setMode("list");
      setNombre("");
      setCodigo("");
      setLargo("");
      setError(null);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "No pudimos crear el perfil."
      );
    }
  };

  return (
    <div
      className={`${s.recipeBuildReference} ${s.recipeBuildSelectLike} ${s.recipeBuildPicker}`}
      ref={rootRef}
      data-open={open}
    >
      <button
        type="button"
        className={s.recipeBuildPickerTrigger}
        aria-label="Perfil o referencia"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        disabled={readOnly}
        onClick={() => {
          if (readOnly) return;
          setOpen((current) => !current);
          setMode("list");
          setError(null);
        }}
      >
        <span data-empty={!profileReferenceLabel(profile)}>{label}</span>
      </button>

      {open ? (
        <div
          id={panelId}
          className={s.recipeBuildPickerPanel}
          role="dialog"
          aria-label="Elegir perfil del taller"
        >
          {mode === "list" ? (
            <>
              {recent.length > 0 ? (
                <div className={s.recipeBuildPickerGroup}>
                  <p>Usados en esta línea</p>
                  <ul>
                    {recent.map((entry) => (
                      <li key={entry.id}>
                        <button
                          type="button"
                          onClick={() => {
                            onSelect(entry);
                            setOpen(false);
                          }}
                        >
                          <strong>{entry.nombre}</strong>
                          <small>
                            {entry.codigoComercial
                              ? `Código ${entry.codigoComercial}`
                              : "Sin código"}
                            {entry.largoComercialMm
                              ? ` · ${entry.largoComercialMm.toLocaleString("es-CL")} mm`
                              : ""}
                          </small>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className={s.recipeBuildPickerGroup}>
                <p>{recent.length > 0 ? "Todos los perfiles" : "Perfiles del taller"}</p>
                {others.length === 0 && recent.length === 0 ? (
                  <div className={s.recipeBuildPickerEmpty}>
                    Aún no hay perfiles guardados. Crea el primero.
                  </div>
                ) : others.length === 0 ? (
                  <div className={s.recipeBuildPickerEmpty}>
                    No hay más perfiles fuera de esta línea.
                  </div>
                ) : (
                  <ul>
                    {others.map((entry) => (
                      <li key={entry.id}>
                        <button
                          type="button"
                          onClick={() => {
                            onSelect(entry);
                            setOpen(false);
                          }}
                        >
                          <strong>{entry.nombre}</strong>
                          <small>
                            {entry.codigoComercial
                              ? `Código ${entry.codigoComercial}`
                              : "Sin código"}
                            {entry.largoComercialMm
                              ? ` · ${entry.largoComercialMm.toLocaleString("es-CL")} mm`
                              : ""}
                          </small>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <button
                type="button"
                className={s.recipeBuildPickerCreateAction}
                onClick={() => {
                  setMode("create");
                  setNombre("");
                  setCodigo("");
                  setLargo("");
                  setError(null);
                }}
              >
                <Plus size={15} aria-hidden />
                Crear perfil
              </button>
            </>
          ) : (
            <div className={s.recipeBuildPickerCreateForm}>
              <p>Nuevo perfil del taller</p>
              <label>
                <span>Nombre / referencia</span>
                <input
                  value={nombre}
                  placeholder="Ej. Jamba L5000"
                  onChange={(event) => setNombre(event.target.value)}
                  autoFocus
                />
              </label>
              <label>
                <span>
                  Código comercial <em>(opcional)</em>
                </span>
                <input
                  value={codigo}
                  placeholder="Ej. 5003"
                  onChange={(event) => setCodigo(event.target.value)}
                />
              </label>
              <label>
                <span>
                  Largo comercial <em>(opcional)</em>
                </span>
                <input
                  type="number"
                  min={1}
                  value={largo}
                  placeholder="Ej. 6000"
                  onChange={(event) => setLargo(event.target.value)}
                />
              </label>
              {error ? <div className={s.recipeBuildPickerError}>{error}</div> : null}
              <div className={s.recipeBuildPickerCreateActions}>
                <button
                  type="button"
                  className={s.secondaryButton}
                  onClick={() => {
                    setMode("list");
                    setError(null);
                  }}
                >
                  Volver
                </button>
                <button type="button" className={s.primaryButton} onClick={handleCreate}>
                  Usar perfil
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
