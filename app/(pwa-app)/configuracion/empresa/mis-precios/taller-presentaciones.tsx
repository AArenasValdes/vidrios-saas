"use client";

import { useEffect, useState } from "react";
import s from "./taller-presentaciones.module.css";

type OfficialInput = { id: string; codigo_fuente: string; nombre: string };
type WorkshopRow = {
  id: string; revision: number; codigo_tecnico: string; nombre_perfil: string; sku_taller: string;
  acabado_nombre: string | null; largo_comercial_mm: number | null;
  precio_neto: number | null; moneda: string | null; unidad_compra: string;
  preferida: boolean;
};
type Payload = { familyKey: string; officialInputs: OfficialInput[]; ownPresentations: WorkshopRow[] };

export function TallerPresentaciones({ lineTemplateId, familyKey }: { lineTemplateId: number; familyKey: string }) {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<WorkshopRow | null>(null);
  const [officialInputId, setOfficialInputId] = useState("");
  const [technicalCode, setTechnicalCode] = useState("");
  const [profileName, setProfileName] = useState("");
  const [recipeCode, setRecipeCode] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [finish, setFinish] = useState("");
  const [unit, setUnit] = useState<"M" | "UN" | "KG" | "PAR">("M");
  const [length, setLength] = useState("");
  const [price, setPrice] = useState("");
  const [preferred, setPreferred] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/proveedor-catalogos/taller-presentaciones?lineTemplateId=${lineTemplateId}`, { cache: "no-store" });
      const data = await response.json() as Payload & { error?: string };
      if (!response.ok) throw new Error(data.error || "No pudimos cargar los perfiles del taller.");
      setPayload(data);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No disponible."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [lineTemplateId]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const commercialLengthMm = length.trim() ? Number(length) : null;
    const netPrice = price.trim() ? Number(price) : null;
    if (commercialLengthMm !== null && (!Number.isInteger(commercialLengthMm) || commercialLengthMm <= 0)) {
      setError("El largo debe ser positivo y expresado en milímetros."); return;
    }
    if (netPrice !== null && (!Number.isFinite(netPrice) || netPrice <= 0)) {
      setError("El costo de compra debe ser positivo; deja el campo vacío si aún no lo sabes."); return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/proveedor-catalogos/taller-presentaciones", {
        method: editingRow ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingRow ? {
          lineTemplateId, presentationId: editingRow.id, expectedRevision: editingRow.revision,
          purchaseUnit: unit, commercialLengthMm, netPrice, currency: netPrice == null ? null : "CLP",
          preferred,
        } : {
          lineTemplateId, officialInputId: officialInputId || null,
          technicalCode: officialInputId ? null : technicalCode.trim() || null,
          profileName: officialInputId ? null : profileName.trim() || null,
          recipeCode: recipeCode.trim() || null, workshopSku: sku.trim(),
          description: description.trim(), finishName: finish.trim() || null,
          purchaseUnit: unit, commercialLengthMm, netPrice,
          currency: netPrice == null ? null : "CLP",
          preferred,
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "No pudimos guardar la presentación.");
      setOpen(false); setEditingRow(null); setSku(""); setDescription(""); setFinish(""); setLength(""); setPrice(""); setRecipeCode(""); setPreferred(false);
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos guardar."); }
    finally { setSaving(false); }
  }

  if (loading && !payload) return <section className={s.panel}>Cargando perfiles de esta familia…</section>;
  if (!payload) return <section className={s.panel}><h3>Presentaciones del taller</h3><p className={s.error} role="alert">{error ?? "No pudimos cargar los datos privados."}</p></section>;
  if (payload?.familyKey !== familyKey) return null;
  return <section className={s.panel} aria-label="Presentaciones privadas del taller">
    <div className={s.heading}><div><h3>Presentaciones del taller</h3><p>Son datos privados de tu empresa. No cambian la lista oficial ni el precio de venta.</p></div>
      <button type="button" onClick={() => { setEditingRow(null); setPreferred(false); setOpen((value) => !value); }}>{open ? "Cerrar" : "Agregar presentación"}</button></div>
    {error ? <p className={s.error} role="alert">{error}</p> : null}
    {payload.ownPresentations.length ? <div className={s.rows}>{payload.ownPresentations.map((row) => <div className={s.row} key={row.id}>
      <strong>{row.codigo_tecnico} · {row.nombre_perfil}</strong><span>{row.sku_taller}{row.acabado_nombre ? ` · ${row.acabado_nombre}` : " · Acabado independiente"}</span>
      <small>{row.largo_comercial_mm ? `${row.largo_comercial_mm.toLocaleString("es-CL")} mm` : "Largo pendiente"} · {row.precio_neto ? `${new Intl.NumberFormat("es-CL", { style: "currency", currency: row.moneda || "CLP" }).format(row.precio_neto)} neto` : "Costo pendiente"} · {row.preferida ? "Elegida para esta configuración" : "Sin elegir"} · Revisión {row.revision}</small>
      <button type="button" className={s.editButton} onClick={() => { setEditingRow(row); setUnit(row.unidad_compra as typeof unit); setLength(row.largo_comercial_mm?.toString() ?? ""); setPrice(row.precio_neto?.toString() ?? ""); setPreferred(row.preferida); setOpen(true); }}>Editar presentación</button>
    </div>)}</div> : <p className={s.empty}>Aún no hay presentaciones privadas para esta familia.</p>}
    {open ? <form className={s.form} onSubmit={(event) => void save(event)}>
      {!editingRow ? <><label>Perfil <select value={officialInputId} onChange={(event) => setOfficialInputId(event.target.value)}><option value="">Nuevo perfil del taller</option>{payload.officialInputs.map((input) => <option key={input.id} value={input.id}>{input.codigo_fuente} · {input.nombre}</option>)}</select></label>
      {!officialInputId ? <div className={s.pair}><label>Código privado<input value={technicalCode} onChange={(event) => setTechnicalCode(event.target.value)} required maxLength={100} /></label><label>Nombre del perfil<input value={profileName} onChange={(event) => setProfileName(event.target.value)} required maxLength={160} /></label></div> : null}
      <label>Código en tu receta, si es diferente<input value={recipeCode} onChange={(event) => setRecipeCode(event.target.value)} maxLength={100} placeholder="Solo con asociación comprobada por tu taller" /></label>
      <div className={s.pair}><label>SKU o código de compra privado<input value={sku} onChange={(event) => setSku(event.target.value)} required maxLength={100} /></label><label>Descripción de compra<input value={description} onChange={(event) => setDescription(event.target.value)} required maxLength={240} /></label></div>
      <label>Acabado<input value={finish} onChange={(event) => setFinish(event.target.value)} placeholder="Vacío si es independiente" maxLength={100} /></label></> : <strong>Completar {editingRow.sku_taller}</strong>}
      <label>Unidad de compra<select value={unit} onChange={(event) => setUnit(event.target.value as typeof unit)}><option value="M">Metro / barra</option><option value="UN">Unidad</option><option value="KG">Kg</option><option value="PAR">Par</option></select></label>
      <div className={s.pair}><label>Largo comercial (mm)<input type="number" min={1} step={1} value={length} onChange={(event) => setLength(event.target.value)} placeholder="Pendiente" /></label><label>Costo neto de compra CLP<input type="number" min={1} step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="Pendiente" /></label></div>
      <label className={s.preferredChoice}><input type="checkbox" checked={preferred} onChange={(event) => setPreferred(event.target.checked)} /> Elegir esta presentación para la configuración</label>
      <p className={s.hint}>Si falta largo o costo, se conserva como pendiente. No se utiliza $0 ni se asume 5.800 mm.</p>
      <button type="submit" disabled={saving}>{saving ? "Guardando…" : editingRow ? "Guardar nueva revisión" : "Guardar dato privado"}</button>
    </form> : null}
  </section>;
}
