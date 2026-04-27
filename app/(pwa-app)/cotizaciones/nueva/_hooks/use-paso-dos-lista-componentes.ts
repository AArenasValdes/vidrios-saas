"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ComponentListCardViewModel } from "@/features/cotizaciones/new-quote/workflow-ui";
import {
  STEP_TWO_DEFAULT_GAP,
  STEP_TWO_DEFAULT_ROW_HEIGHT,
  STEP_TWO_SCROLL_THRESHOLD,
  STEP_TWO_VIRTUALIZATION_OVERSCAN,
  STEP_TWO_VIRTUALIZATION_THRESHOLD,
} from "@/features/cotizaciones/new-quote/workflow-ui";

type UsePasoDosListaComponentesParams = {
  paso: 1 | 2 | 3;
  esVistaMovil: boolean;
  tarjetasFiltradas: ComponentListCardViewModel[];
  cantidadItemsTotales: number;
  itemSeleccionadoId: string | null;
};

export function usePasoDosListaComponentes(params: UsePasoDosListaComponentesParams) {
  const frameScrollRef = useRef<number | null>(null);
  const listaRef = useRef<HTMLDivElement | null>(null);
  const resumenRef = useRef<HTMLDivElement | null>(null);
  const ultimoScrollTopRef = useRef(0);
  const ultimoAltoListaRef = useRef(0);

  const [scrollTopLista, setScrollTopLista] = useState(0);
  const [altoLista, setAltoLista] = useState(0);
  const [altoFilaLista, setAltoFilaLista] = useState(STEP_TWO_DEFAULT_ROW_HEIGHT);
  const [gapLista, setGapLista] = useState(STEP_TWO_DEFAULT_GAP);

  useEffect(() => {
    return () => {
      if (frameScrollRef.current !== null) {
        window.cancelAnimationFrame(frameScrollRef.current);
        frameScrollRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const debeObservarListaScrollable =
      params.esVistaMovil || params.cantidadItemsTotales >= STEP_TWO_VIRTUALIZATION_THRESHOLD;

    if (params.paso !== 2 || !debeObservarListaScrollable) {
      return;
    }

    const listNode = listaRef.current;

    if (!listNode) {
      return;
    }

    const syncMetrics = () => {
      const nextHeight = listNode.clientHeight;
      const nextScrollTop = listNode.scrollTop;

      if (ultimoAltoListaRef.current !== nextHeight) {
        ultimoAltoListaRef.current = nextHeight;
        setAltoLista(nextHeight);
      }

      if (ultimoScrollTopRef.current !== nextScrollTop) {
        ultimoScrollTopRef.current = nextScrollTop;
        setScrollTopLista(nextScrollTop);
      }
    };

    const handleScroll = () => {
      if (frameScrollRef.current !== null) {
        return;
      }

      frameScrollRef.current = window.requestAnimationFrame(() => {
        const nextScrollTop = listNode.scrollTop;

        if (ultimoScrollTopRef.current !== nextScrollTop) {
          ultimoScrollTopRef.current = nextScrollTop;
          setScrollTopLista(nextScrollTop);
        }

        frameScrollRef.current = null;
      });
    };

    syncMetrics();
    listNode.addEventListener("scroll", handleScroll, { passive: true });

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => {
        syncMetrics();
      });

      observer.observe(listNode);

      return () => {
        listNode.removeEventListener("scroll", handleScroll);
        if (frameScrollRef.current !== null) {
          window.cancelAnimationFrame(frameScrollRef.current);
          frameScrollRef.current = null;
        }
        observer.disconnect();
      };
    }

    window.addEventListener("resize", syncMetrics);

    return () => {
      listNode.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", syncMetrics);
      if (frameScrollRef.current !== null) {
        window.cancelAnimationFrame(frameScrollRef.current);
        frameScrollRef.current = null;
      }
    };
  }, [params.cantidadItemsTotales, params.esVistaMovil, params.paso]);

  const scrollItemSeleccionadoIntoView = useCallback((itemId: string) => {
    const container = listaRef.current;
    if (!container) {
      return;
    }

    const itemNode = container.querySelector<HTMLElement>(`[data-step-two-item-id="${itemId}"]`);
    if (!itemNode) {
      return;
    }

    const itemTop = itemNode.offsetTop;
    const itemBottom = itemTop + itemNode.offsetHeight;
    const currentTop = container.scrollTop;
    const currentBottom = currentTop + container.clientHeight;
    const edgePadding = 10;
    let nextTop: number | null = null;

    if (itemTop < currentTop + edgePadding) {
      nextTop = Math.max(0, itemTop - edgePadding);
    } else if (itemBottom > currentBottom - edgePadding) {
      nextTop = Math.max(0, itemBottom - container.clientHeight + edgePadding);
    }

    if (nextTop === null || Math.abs(nextTop - currentTop) < 4) {
      return;
    }

    container.scrollTo({
      top: nextTop,
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    if (!params.esVistaMovil || !params.itemSeleccionadoId) {
      return;
    }

    const itemSeleccionadoId = params.itemSeleccionadoId;
    const frame = window.requestAnimationFrame(() => {
      scrollItemSeleccionadoIntoView(itemSeleccionadoId);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [params.esVistaMovil, params.itemSeleccionadoId, scrollItemSeleccionadoIntoView]);

  const virtualizarLista = false;
  const usarScrollLista =
    params.esVistaMovil || params.tarjetasFiltradas.length > STEP_TWO_SCROLL_THRESHOLD;

  const estadoVisibleLista = useMemo(() => {
    if (!virtualizarLista || altoLista <= 0) {
      return {
        cards: params.tarjetasFiltradas,
        paddingTop: 0,
        paddingBottom: 0,
      };
    }

    const rowHeight = Math.max(1, altoFilaLista);
    const gap = Math.max(0, gapLista);
    const stride = rowHeight + gap;
    const startIndex = Math.max(
      0,
      Math.floor(scrollTopLista / stride) - STEP_TWO_VIRTUALIZATION_OVERSCAN
    );
    const visibleCount =
      Math.ceil(altoLista / stride) + STEP_TWO_VIRTUALIZATION_OVERSCAN * 2;
    const endIndex = Math.min(params.tarjetasFiltradas.length, startIndex + visibleCount);
    const hiddenBefore = startIndex;
    const hiddenAfter = Math.max(0, params.tarjetasFiltradas.length - endIndex);

    return {
      cards: params.tarjetasFiltradas.slice(startIndex, endIndex),
      paddingTop:
        hiddenBefore > 0
          ? hiddenBefore * rowHeight + Math.max(0, hiddenBefore - 1) * gap
          : 0,
      paddingBottom:
        hiddenAfter > 0
          ? hiddenAfter * rowHeight + Math.max(0, hiddenAfter - 1) * gap
          : 0,
    };
  }, [altoFilaLista, altoLista, gapLista, params.tarjetasFiltradas, scrollTopLista, virtualizarLista]);

  const medirPrimeraFila = useCallback((node: HTMLElement | null) => {
    if (!node || !listaRef.current) {
      return;
    }

    const listStyles = window.getComputedStyle(listaRef.current);
    const nextGap = Number.parseFloat(listStyles.rowGap || listStyles.gap || "0");
    const nextRowHeight = Math.ceil(node.getBoundingClientRect().height);

    if (Number.isFinite(nextGap) && Math.abs(nextGap - gapLista) > 1) {
      setGapLista(nextGap);
    }

    if (Number.isFinite(nextRowHeight) && Math.abs(nextRowHeight - altoFilaLista) > 2) {
      setAltoFilaLista(nextRowHeight);
    }
  }, [altoFilaLista, gapLista]);

  return {
    listaRef,
    resumenRef,
    estadoVisibleLista,
    usarScrollLista,
    medirPrimeraFila,
    scrollItemSeleccionadoIntoView,
  };
}
