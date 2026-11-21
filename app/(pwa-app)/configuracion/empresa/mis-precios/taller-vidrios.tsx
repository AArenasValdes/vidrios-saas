"use client";

import { useEffect, useState } from "react";
import s from "./taller-presentaciones.module.css";

type GlassCategory = "monolitico" | "laminado" | "dvh" | "templado" | "espejo";

type GlassProductOption = {
  id: number;
  productId: string;
  name: string;
  category: string;
  thicknessMm: number | null;
};

type GlassPresentationRow = {
  id: string;
  revision: number;
  glassLineTemplateId: number | null;
  glassProductId: string | null;
  category: GlassCategory;
  thicknessMm: number | null;
  glassDescription?: string | null;
  providerLabel?: string | null;
  netPricePerM2: number;
  minBillableM2PerPane?: number | null;
  currency: string;
  validFrom?: string | null;
  validUntil?: string | null;
};

type Payload = {
  glassProducts: GlassProductOption[];
  presentations: GlassPresentationRow[];
  schemaPending?: boolean;
  canManage?: boolean;
  error?: string;
};

const CATEGORY_LABELS: Record<GlassCategory, string> = {
  monolitico: "Monolítico",
  laminado: "Laminado",
  dvh: "DVH / Termopanel",
  templado: "Templado",
  espejo: "Espejo",
};

const moneyFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export function TallerVidrios() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<GlassPresentationRow | null>(null);

  const [glassLineTemplateId, setGlassLineTemplateId] = useState("");
  const [category, setCategory] = useState<GlassCategory>("monolitico");
  const [thicknessMm, setThicknessMm] = useState("5");
  const [description, setDescription] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [netPricePerM2, setNetPricePerM2] = useState("");
  const [minBillableM2, setMinBillableM2] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");

  async function load() {
    setError(null);
    try {
      const response = await fetch("/api/proveedor-catalogos/taller-vidrios", { cache: "no-store" });
      if (response.status === 404) {
        setPayload({ glassProducts: [], presentations: [], canManage: false });
        return;
      }
      const data = (await response.json()) as Partial<Payload>;
      if (!response.ok) throw new Error(data.error || "No pudimos cargar los precios de vidrio.");
      setPayload({
        glassProducts: Array.isArray(data.glassProducts) ? data.glassProducts : [],
        presentations: Array.isArray(data.presentations) ? data.presentations : [],
        schemaPending: data.schemaPending,
        canManage: data.canManage,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No disponible.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (typeof fetch !== "function") {
      return;
    }
    let active = true;
    fetch("/api/proveedor-catalogos/taller-vidrios", { cache: "no-store" })
      .then(async (response) => {
        if (!active) return;
        if (response.status === 404) {
          setPayload({ glassProducts: [], presentations: [], canManage: false });
          return;
        }
        const data = (await response.json()) as Partial<Payload>;
        if (!response.ok) throw new Error(data.error || "No pudimos cargar los precios de vidrio.");
        setPayload({
          glassProducts: Array.isArray(data.glassProducts) ? data.glassProducts : [],
          presentations: Array.isArray(data.presentations) ? data.presentations : [],
          schemaPending: data.schemaPending,
          canManage: data.canManage,
        });
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "No disponible.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function resetForm() {
    setEditingRow(null);
    setGlassLineTemplateId("");
    setCategory("monolitico");
    setThicknessMm("5");
    setDescription("");
    setSupplierName("");
    setNetPricePerM2("");
    setMinBillableM2("");
    setValidFrom("");
    setValidUntil("");
  }

  function handleSelectProduct(value: string) {
    setGlassLineTemplateId(value);
    const product = payload?.glassProducts.find((item) => String(item.id) === value);
    if (!product) return;
    if (product.category in CATEGORY_LABELS) {
      setCategory(product.category as GlassCategory);
    }
    if (product.thicknessMm != null) {
      setThicknessMm(String(product.thicknessMm));
    }
    setDescription(product.name);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const parsedPrice = Number(netPricePerM2);
    const parsedThickness = Number(thicknessMm);
    const parsedMin = minBillableM2.trim() ? Number(minBillableM2) : null;
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setError("Ingresa un precio neto de compra positivo por m².");
      return;
    }
    if (!editingRow && !glassLineTemplateId) {
      setError("Selecciona un cristal de tu catálogo privado.");
      return;
    }
    if (!editingRow && (!Number.isFinite(parsedThickness) || parsedThickness <= 0)) {
      setError("El espesor en milímetros debe ser mayor a 0.");
      return;
    }
    if (parsedMin !== null && (!Number.isFinite(parsedMin) || parsedMin <= 0)) {
      setError("El mínimo cobrable por paño debe ser mayor a 0.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/proveedor-catalogos/taller-vidrios", {
        method: editingRow ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingRow
            ? {
                presentationId: editingRow.id,
                expectedRevision: editingRow.revision,
                supplierName: supplierName.trim(),
                netPricePerM2: parsedPrice,
                minBillableM2PerPane: parsedMin,
                currency: "CLP",
                validFrom: validFrom.trim() || null,
                validUntil: validUntil.trim() || null,
              }
            : {
                glassLineTemplateId: Number(glassLineTemplateId),
                glassProductId: glassLineTemplateId,
                category,
                thicknessMm: parsedThickness,
                description: description.trim() || `${CATEGORY_LABELS[category]} ${parsedThickness}mm`,
                supplierName: supplierName.trim(),
                netPricePerM2: parsedPrice,
                minBillableM2PerPane: parsedMin,
                currency: "CLP",
                validFrom: validFrom.trim() || null,
                validUntil: validUntil.trim() || null,
              }
        ),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "No pudimos guardar el precio de vidrio.");
      setOpen(false);
      resetForm();
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos guardar.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !payload || payload.schemaPending) return null;

  return (
    <section className={s.panel} aria-label="Vidrio al corte por m²">
      <div className={s.heading}>
        <div>
          <h3>Vidrio al corte (m²)</h3>
          <p>Costo neto de compra al proveedor por m² (no modifica tu precio de venta).</p>
        </div>
        {payload.canManage !== false ? (
          <button
            type="button"
            onClick={() => {
              if (open) {
                setOpen(false);
                resetForm();
              } else {
                resetForm();
                setOpen(true);
              }
            }}
          >
            {open ? "Cerrar" : "Agregar vidrio"}
          </button>
        ) : null}
      </div>

      {error ? (
        <p className={s.error} role="alert">
          {error}
        </p>
      ) : null}

      {payload.presentations.length > 0 ? (
        <div className={s.rows}>
          {payload.presentations.map((row) => (
            <div className={s.row} key={row.id}>
              <strong>
                {row.glassDescription || `${CATEGORY_LABELS[row.category] ?? row.category} ${row.thicknessMm ?? ""} mm`}
              </strong>
              <span>
                {row.providerLabel || "Proveedor del taller"} · {CATEGORY_LABELS[row.category] ?? row.category}{" "}
                {row.thicknessMm != null ? `${row.thicknessMm} mm` : ""}
              </span>
              <small>
                {moneyFormatter.format(row.netPricePerM2)} / m² neto
                {row.minBillableM2PerPane != null ? ` · Mín. ${row.minBillableM2PerPane} m²/paño` : ""}
                {row.validUntil ? ` · Vigente hasta ${row.validUntil}` : ""}
              </small>
              {payload.canManage !== false ? (
                <button
                  type="button"
                  className={s.editButton}
                  onClick={() => {
                    setEditingRow(row);
                    setSupplierName(row.providerLabel ?? "");
                    setNetPricePerM2(String(row.netPricePerM2));
                    setMinBillableM2(row.minBillableM2PerPane != null ? String(row.minBillableM2PerPane) : "");
                    setValidFrom(row.validFrom ?? "");
                    setValidUntil(row.validUntil ?? "");
                    setOpen(true);
                  }}
                >
                  Editar costo
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : !payload.schemaPending ? (
        <p className={s.empty}>Aún no registras precios de compra de vidrio al corte.</p>
      ) : null}

      {open ? (
        <form className={s.form} onSubmit={(event) => void handleSubmit(event)}>
          {!editingRow ? (
            <>
              {payload.glassProducts.length > 0 ? (
                <label>
                  Cristal de tu catálogo
                  <select
                    value={glassLineTemplateId}
                    onChange={(event) => handleSelectProduct(event.target.value)}
                    required
                  >
                    <option value="">Elegir cristal de tu catálogo</option>
                    {payload.glassProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <p className={s.hint} role="status">
                  Primero agrega un cristal en <strong>Mis líneas y precios</strong> para asociarle su costo de compra al corte.
                </p>
              )}
              <div className={s.pair}>
                <label>
                  Categoría
                  <select value={category} onChange={(event) => setCategory(event.target.value as GlassCategory)}>
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Espesor (mm)
                  <input
                    type="number"
                    min={1}
                    step="0.1"
                    value={thicknessMm}
                    onChange={(event) => setThicknessMm(event.target.value)}
                    required
                  />
                </label>
              </div>
              <label>
                Descripción del vidrio
                <input
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Ej. Incoloro monolítico 5mm"
                  maxLength={240}
                  required
                />
              </label>
            </>
          ) : (
            <strong>Editar {editingRow.glassDescription || "precio de vidrio"}</strong>
          )}

          <label>
            Proveedor de vidrio
            <input
              value={supplierName}
              onChange={(event) => setSupplierName(event.target.value)}
              placeholder="Ej. Vidriería del Sur"
              maxLength={120}
              required
            />
          </label>
          <div className={s.pair}>
            <label>
              Precio neto / m² (CLP)
              <input
                type="number"
                min={1}
                step="1"
                value={netPricePerM2}
                onChange={(event) => setNetPricePerM2(event.target.value)}
                required
              />
            </label>
            <label>
              Mínimo m² por paño (opcional)
              <input
                type="number"
                min={0.01}
                step="0.01"
                value={minBillableM2}
                onChange={(event) => setMinBillableM2(event.target.value)}
                placeholder="Sin mínimo"
              />
            </label>
          </div>
          <div className={s.pair}>
            <label>
              Vigente desde (opcional)
              <input type="date" value={validFrom} onChange={(event) => setValidFrom(event.target.value)} />
            </label>
            <label>
              Vigente hasta (opcional)
              <input type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} />
            </label>
          </div>
          <button type="submit" disabled={saving || (!editingRow && payload.glassProducts.length === 0)}>
            {saving ? "Guardando…" : editingRow ? "Guardar nueva revisión" : "Guardar precio de vidrio"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
