"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadMyPrices, saveMyPriceChange, type MyPricesCatalog } from "../services/mis-precios.client.service";

type Change = Parameters<typeof saveMyPriceChange>[0];

export function useMisPrecios() {
  const [catalog, setCatalog] = useState<MyPricesCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const initialLoad = useRef<Promise<MyPricesCatalog> | null>(null);
  const refresh = useCallback(async () => {
    try { setCatalog(await loadMyPrices()); setError(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos cargar tus precios."); }
  }, []);
  useEffect(() => {
    let active = true;
    // Strict Mode replays this effect. Share only this mount's request, never
    // a catalog containing private prices between users or page visits.
    const pending = initialLoad.current ??= loadMyPrices();
    void pending.then((result) => {
      if (active) { setCatalog(result); setError(null); }
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "No pudimos cargar tus precios.");
    });
    return () => { active = false; };
  }, []);
  const save = useCallback(async (change: Change) => {
    setBusy(true);
    setError(null);
    try { await saveMyPriceChange(change); await refresh(); return true; }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos guardar el precio."); return false; }
    finally { setBusy(false); }
  }, [refresh]);
  return { catalog, error, busy, save, refresh };
}
