"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  resolveSupplierPresentationsForQuote,
  type SupplierPresentationQuoteItemRequest,
  type SupplierPresentationResolutionResponse,
} from "@/features/proveedor-catalogos/services/supplier-presentations.client";

/** Fetches current explicit selections for a preview. Persisted snapshots remain owned by callers. */
export function useSupplierPresentationResolution(
  requests: readonly SupplierPresentationQuoteItemRequest[],
  options: { includeProviderOptions?: boolean; includeProfilePrices?: boolean } = {}
) {
  const includeProviderOptions = options.includeProviderOptions === true;
  const includeProfilePrices = options.includeProfilePrices !== false;
  const key = useMemo(() => JSON.stringify({ requests, includeProfilePrices }), [includeProfilePrices, requests]);
  const [refreshRevision, setRefreshRevision] = useState(0);
  const [state, setState] = useState<{
    key: string;
    result: SupplierPresentationResolutionResponse | null;
  } | null>(null);

  useEffect(() => {
    if (requests.length === 0) {
      return;
    }
    let active = true;
    // Parse from the serialized key so freshly-created request arrays with the
    // same payload do not trigger duplicate network calls on every render.
    const payload = JSON.parse(key) as {
      requests: SupplierPresentationQuoteItemRequest[];
      includeProfilePrices: boolean;
    };
    void resolveSupplierPresentationsForQuote(payload.requests, {
      includeProviderOptions,
      includeProfilePrices: payload.includeProfilePrices,
    }).then((result) => {
      if (active) setState({ key, result });
    });
    return () => { active = false; };
  }, [includeProviderOptions, key, refreshRevision, requests.length]);

  const result = requests.length > 0 && state?.key === key ? state.result : null;
  const refresh = useCallback(() => setRefreshRevision((revision) => revision + 1), []);
  return {
    result,
    isResolving: requests.length > 0 && state?.key !== key,
    refresh,
  };
}
