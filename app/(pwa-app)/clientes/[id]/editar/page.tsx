"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LuArrowLeft,
  LuFileText,
  LuMapPin,
  LuPhone,
  LuSave,
  LuUserRound,
} from "react-icons/lu";

import { useClientes } from "@/hooks/useClientes";

import s from "../../nuevo/page.module.css";

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

export default function EditarClientePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const {
    getClienteDetalleById,
    loadClienteDetalleById,
    updateCliente,
    isReady,
    isSaving,
  } = useClientes();
  const detalle = getClienteDetalleById(params.id);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) {
      setLoadingDetail(false);
      return;
    }

    if (detalle) {
      setLoadingDetail(false);
      return;
    }

    let active = true;

    void loadClienteDetalleById(params.id).finally(() => {
      if (active) {
        setLoadingDetail(false);
      }
    });

    return () => {
      active = false;
    };
  }, [detalle, loadClienteDetalleById, params.id]);

  useEffect(() => {
    if (!detalle) {
      return;
    }

    setForm({
      nombre: detalle.cliente.nombre,
      telefono: detalle.cliente.telefono ?? "",
      correo: detalle.cliente.correo ?? "",
      direccion: detalle.cliente.direccion ?? "",
    });
  }, [detalle]);

  useEffect(() => {
    if (!params.id) {
      return;
    }

    router.prefetch(`/clientes/${params.id}`);
  }, [params.id, router]);

  const canSave = Boolean(form.nombre.trim());
  const detailHref = `/clientes/${params.id}`;
  const contextFacts = useMemo(
    () =>
      detalle
        ? [
            { label: "Obras", value: String(detalle.proyectos.length) },
            { label: "Cotizaciones", value: String(detalle.cotizaciones.length) },
            { label: "Ultima gestion", value: detalle.resumen.ultimaGestion },
          ]
        : [],
    [detalle]
  );

  const handleChange = useCallback(
    (field: keyof FormState) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    if (!canSave) {
      return;
    }

    setError(null);

    try {
      await updateCliente(params.id, {
        nombre: form.nombre,
        telefono: form.telefono,
        correo: form.correo,
        direccion: form.direccion,
      });
      router.push(detailHref);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "No se pudo actualizar el cliente"
      );
    }
  }, [
    canSave,
    detailHref,
    form.correo,
    form.direccion,
    form.nombre,
    form.telefono,
    params.id,
    router,
    updateCliente,
  ]);

  if (!loadingDetail && isReady && !detalle) {
    return (
      <div className={s.root}>
        <div className={s.header}>
          <div className={s.headerCopy}>
            <Link href="/clientes" className={s.backLink}>
              <LuArrowLeft aria-hidden />
              Volver a clientes
            </Link>
            <h1 className={s.title}>Cliente no encontrado</h1>
            <p className={s.subtitle}>No se puede editar una ficha que no existe.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!detalle) {
    return null;
  }

  return (
    <div className={s.root}>
      <div className={s.header}>
        <div className={s.headerCopy}>
          <Link href={detailHref} className={s.backLink}>
            <LuArrowLeft aria-hidden />
            Volver a la ficha
          </Link>
          <h1 className={s.title}>Editar cliente</h1>
          <p className={s.subtitle}>
            Corrige los datos de contacto sin perder el historial comercial del cliente.
          </p>
        </div>

        <div className={s.headerActions}>
          <Link className={s.btnGhost} href={detailHref}>
            Cancelar
          </Link>
          <button
            className={s.btnPrimary}
            disabled={!canSave || isSaving}
            onClick={handleSubmit}
            type="button"
          >
            <LuSave aria-hidden />
            {isSaving ? "Guardando..." : "Guardar cambios"}
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
                <input
                  onChange={handleChange("nombre")}
                  type="text"
                  value={form.nombre}
                />
              </div>
            </label>

            <label className={s.field}>
              <span className={s.label}>Telefono</span>
              <div className={s.inputWrap}>
                <LuPhone aria-hidden />
                <input
                  onChange={handleChange("telefono")}
                  type="tel"
                  value={form.telefono}
                />
              </div>
            </label>

            <label className={s.field}>
              <span className={s.label}>Correo</span>
              <div className={s.inputWrap}>
                <LuFileText aria-hidden />
                <input
                  onChange={handleChange("correo")}
                  type="email"
                  value={form.correo}
                />
              </div>
            </label>
          </div>
        </section>

        <aside className={s.sideCard}>
          <div className={s.sideBlock}>
            <p className={s.sectionEyebrow}>Contexto actual</p>
            <div className={s.factList}>
            {contextFacts.map((item) => (
              <div key={item.label} className={s.factItem}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
            <div className={s.factItem}>
              <span>Estado actual</span>
              <strong>{detalle.resumen.estado}</strong>
            </div>
          </div>
        </div>
      </aside>

        <section className={s.formCard}>
          <div className={s.sectionHeader}>
            <div>
              <p className={s.sectionEyebrow}>Ubicacion</p>
              <h2 className={s.sectionTitle}>Direccion comercial</h2>
            </div>
          </div>

          <div className={s.formGrid}>
            <label className={`${s.field} ${s.fieldWide}`}>
              <span className={s.label}>Direccion</span>
              <div className={s.inputWrap}>
                <LuMapPin aria-hidden />
                <input
                  onChange={handleChange("direccion")}
                  type="text"
                  value={form.direccion}
                />
              </div>
            </label>

            <div className={`${s.field} ${s.fieldWide}`}>
              <span className={s.label}>Estado del cliente</span>
              <p className={s.subtitle}>
                La app lo calcula sola segun su movimiento comercial reciente.
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
