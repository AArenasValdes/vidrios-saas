"use client";

import { useCallback, useEffect, useState } from "react";
import { loadMyPrices, saveMyPriceChange, type MyPricesCatalog } from "../services/mis-precios.client.service";

type Change = Parameters<typeof saveMyPriceChange>[0];

export function useMisPrecios() {
  const [catalog, setCatalog] = useState<MyPricesCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    try { setCatalog(await loadMyPrices()); setError(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos cargar tus precios."); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const save = useCallback(async (change: Change) => {
    setBusy(true);
    setError(null);
    try { await saveMyPriceChange(change); await refresh(); return true; }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos guardar el precio."); return false; }
    finally { setBusy(false); }
  }, [refresh]);
  return { catalog, error, busy, save, refresh };
}
