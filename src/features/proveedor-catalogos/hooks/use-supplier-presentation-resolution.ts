"use client";

import { useEffect, useMemo, useState } from "react";
import {
  resolveSupplierPresentationsForQuote,
  type SupplierPresentationQuoteItemRequest,
  type SupplierPresentationResolutionResponse,
} from "@/features/proveedor-catalogos/services/supplier-presentations.client";

/** Fetches current explicit selections for a preview. Persisted snapshots remain owned by callers. */
export function useSupplierPresentationResolution(
  requests: readonly SupplierPresentationQuoteItemRequest[]
) {
  const key = useMemo(() => JSON.stringify(requests), [requests]);
  const [state, setState] = useState<{
    key: string;
    result: SupplierPresentationResolutionResponse | null;
  } | null>(null);

  useEffect(() => {
    if (requests.length === 0) {
      setState(null);
      return;
    }
    let active = true;
    // Parse from the serialized key so freshly-created request arrays with the
    // same payload do not trigger duplicate network calls on every render.
    const stableRequests = JSON.parse(key) as SupplierPresentationQuoteItemRequest[];
    void resolveSupplierPresentationsForQuote(stableRequests).then((result) => {
      if (active) setState({ key, result });
    });
    return () => { active = false; };
  }, [key, requests.length]);

  const result = state?.key === key ? state.result : null;
  return {
    result,
    isResolving: requests.length > 0 && state?.key !== key,
  };
}
