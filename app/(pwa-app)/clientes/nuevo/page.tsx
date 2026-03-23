"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  LuArrowLeft,
  LuBuilding2,
  LuFileText,
  LuMapPin,
  LuPhone,
  LuSave,
  LuShieldCheck,
  LuUserRound,
} from "react-icons/lu";

import { useClientes } from "@/hooks/useClientes";

import s from "./page.module.css";

const checklist = [
  "Nombre y telefono visibles para contacto rapido.",
  "Direccion o comuna para ordenar rutas y visitas.",
  "Notas comerciales para recordar contexto del trabajo.",
];

type FormState = {
  nombre: string;
  telefono: string;
  correo: string;
  direccion: string;
};

const initialState: FormState = {
  nombre: "",
  telefono: "",
  correo: "",
  direccion: "",
};

export default function NuevoClientePage() {
  const router = useRouter();
  const { createCliente, isSaving } = useClientes();
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState<string | null>(null);

  const canSave = Boolean(form.nombre.trim());

  const handleChange =
    (field: keyof FormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };

  const handleSubmit = async () => {
    if (!canSave) {
      return;
    }

    setError(null);

    try {
      await createCliente({
        nombre: form.nombre,
        telefono: form.telefono,
        correo: form.correo,
        direccion: form.direccion,
      });
      router.push("/clientes");
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "No se pudo crear el cliente"
      );
    }
  };

  return (
    <div className={s.root}>
      <div className={s.header}>
        <div className={s.headerCopy}>
          <Link href="/clientes" className={s.backLink}>
            <LuArrowLeft aria-hidden />
            Volver a clientes
          </Link>
          <h1 className={s.title}>Nuevo cliente</h1>
          <p className={s.subtitle}>
            Registra los datos base para cotizar, coordinar visitas y mantener seguimiento comercial desde una sola ficha.
          </p>
        </div>

        <div className={s.headerActions}>
          <Link className={s.btnGhost} href="/clientes">
            Cancelar
          </Link>
          <button className={s.btnPrimary} disabled={!canSave || isSaving} onClick={handleSubmit} type="button">
            <LuSave aria-hidden />
            {isSaving ? "Creando..." : "Crear cliente"}
          </button>
        </div>
      </div>

      <div className={s.layout}>
        <section className={s.formCard}>
          <div className={s.sectionHeader}>
            <div>
              <p className={s.sectionEyebrow}>Datos principales</p>
              <h2 className={s.sectionTitle}>Identificacion y contacto</h2>
            </div>
          </div>

          <div className={s.formGrid}>
            <label className={`${s.field} ${s.fieldWide}`}>
              <span className={s.label}>Nombre completo</span>
              <div className={s.inputWrap}>
                <LuUserRound aria-hidden />
                <input onChange={handleChange("nombre")} type="text" placeholder="Ej. Roberto Fuentes" value={form.nombre} />
              </div>
            </label>

            <label className={s.field}>
              <span className={s.label}>Telefono</span>
              <div className={s.inputWrap}>
                <LuPhone aria-hidden />
                <input onChange={handleChange("telefono")} type="tel" placeholder="+56 9 1234 5678" value={form.telefono} />
              </div>
            </label>

            <label className={s.field}>
              <span className={s.label}>Correo</span>
              <div className={s.inputWrap}>
                <LuFileText aria-hidden />
                <input onChange={handleChange("correo")} type="email" placeholder="cliente@correo.cl" value={form.correo} />
              </div>
            </label>

          </div>
        </section>

        <aside className={s.sideCard}>
          <div className={s.sideBlock}>
            <p className={s.sectionEyebrow}>Resumen rapido</p>
            <div className={s.factList}>
              <div className={s.factItem}>
                <span>Ficha</span>
                <strong>Cliente real</strong>
              </div>
              <div className={s.factItem}>
                <span>Canal</span>
                <strong>Manual</strong>
              </div>
              <div className={s.factItem}>
                <span>Estado inicial</span>
                <strong>Segun actividad comercial</strong>
              </div>
            </div>
          </div>

          <div className={s.sideBlock}>
            <p className={s.sectionEyebrow}>Checklist</p>
            <div className={s.checkList}>
              {checklist.map((item) => (
                <div key={item} className={s.checkItem}>
                  <span className={s.checkIcon}>
                    <LuShieldCheck aria-hidden />
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className={s.formCard}>
          <div className={s.sectionHeader}>
            <div>
              <p className={s.sectionEyebrow}>Ubicacion</p>
              <h2 className={s.sectionTitle}>Direccion y zona de trabajo</h2>
            </div>
          </div>

          <div className={s.formGrid}>
            <label className={`${s.field} ${s.fieldWide}`}>
              <span className={s.label}>Direccion</span>
              <div className={s.inputWrap}>
                <LuMapPin aria-hidden />
                <input onChange={handleChange("direccion")} type="text" placeholder="Calle, numero y referencia" value={form.direccion} />
              </div>
            </label>

            <div className={`${s.field} ${s.fieldWide}`}>
              <span className={s.label}>Lectura comercial</span>
              <p className={s.subtitle}>
                La app lo ordena sola segun su movimiento comercial: prospecto, seguimiento, activo o inactivo.
              </p>
            </div>
          </div>
        </section>
      </div>

      {error ? (
        <div className={s.sideCard}>
          <p className={s.sectionEyebrow}>Error</p>
          <p className={s.subtitle}>{error}</p>
        </div>
      ) : null}
    </div>
  );
}
