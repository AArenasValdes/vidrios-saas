"use client";

import { useState } from "react";
import styles from "./supplier-family-preference-control.module.css";

type Props = {
  familyKey: string | null;
  selectedProviderKey: string | null;
  selectedProviderLabel: string | null;
  preferenceProviderKey: string | null;
  preferenceLabel: string | null;
  canManage: boolean;
  onSaved: (providerKey: string | null) => void;
};

export function SupplierFamilyPreferenceControl({
  familyKey,
  selectedProviderKey,
  selectedProviderLabel,
  preferenceProviderKey,
  preferenceLabel,
  canManage,
  onSaved,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const show = canManage && Boolean(familyKey) && Boolean(selectedProviderKey || preferenceProviderKey);

  async function save(providerKey: string | null) {
    if (!familyKey || (!providerKey && !preferenceProviderKey)) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/proveedor-catalogos/preferencias-familia", {
        method: providerKey ? "PUT" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(providerKey ? { familyKey, providerKey } : { familyKey }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error || "No se pudo actualizar la preferencia de compra.");
      }
      onSaved(providerKey);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar la preferencia de compra.");
    } finally {
      setSaving(false);
    }
  }

  if (!show) return null;

  return (
    <div className={styles.root} aria-label="Preferencia de compra">
      {preferenceProviderKey ? (
        <p role="status">Habitual para esta línea: <strong>{preferenceLabel ?? preferenceProviderKey}</strong></p>
      ) : (
        <p>La selección actual solo se aplica a esta pieza.</p>
      )}
      {selectedProviderKey && selectedProviderKey !== preferenceProviderKey ? (
        <button type="button" disabled={saving} onClick={() => void save(selectedProviderKey)}>
          {saving ? "Guardando preferencia…" : `Dejar ${selectedProviderLabel ?? "este proveedor"} como habitual`}
        </button>
      ) : null}
      {preferenceProviderKey ? (
        <button type="button" className={styles.remove} disabled={saving} onClick={() => void save(null)}>
          Quitar preferencia
        </button>
      ) : null}
      {error ? <small role="alert">{error}</small> : null}
    </div>
  );
}
