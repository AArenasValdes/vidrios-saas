import { useCallback, useState } from "react";

import type { GuidedVisualConfig } from "@/features/cotizaciones/visual-composer/types/guided-visual-config";

const MAX_HISTORY = 30;

type HistoryState = {
  past: GuidedVisualConfig[];
  present: GuidedVisualConfig;
  future: GuidedVisualConfig[];
};

export function useGuidedVisualHistory(initial: GuidedVisualConfig) {
  const [state, setState] = useState<HistoryState>({
    past: [],
    present: initial,
    future: [],
  });

  const reset = useCallback((next: GuidedVisualConfig) => {
    setState({ past: [], present: next, future: [] });
  }, []);

  const push = useCallback((next: GuidedVisualConfig) => {
    setState((current) => ({
      past: [...current.past, current.present].slice(-MAX_HISTORY),
      present: next,
      future: [],
    }));
  }, []);

  const replace = useCallback((next: GuidedVisualConfig) => {
    setState((current) => ({ ...current, present: next }));
  }, []);

  const commitFrom = useCallback((before: GuidedVisualConfig, after: GuidedVisualConfig) => {
    setState((current) => ({
      past: [...current.past, before].slice(-MAX_HISTORY),
      present: after,
      future: [],
    }));
  }, []);

  const undo = useCallback(() => {
    setState((current) => {
      const previous = current.past[current.past.length - 1];
      if (!previous) {
        return current;
      }
      return {
        past: current.past.slice(0, -1),
        present: previous,
        future: [current.present, ...current.future].slice(0, MAX_HISTORY),
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((current) => {
      const next = current.future[0];
      if (!next) {
        return current;
      }
      return {
        past: [...current.past, current.present].slice(-MAX_HISTORY),
        present: next,
        future: current.future.slice(1),
      };
    });
  }, []);

  return {
    config: state.present,
    setConfig: push,
    replaceConfig: replace,
    commitFrom,
    reset,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
