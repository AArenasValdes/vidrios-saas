"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { growthDashboardService } from "@/features/growth/services/growth-dashboard.service";
import type {
  CreateGrowthProspectInput,
  GrowthFocusFilter,
  GrowthPanelTab,
  GrowthWorkspace,
  UpdateGrowthManualMetricsInput,
  UpdateGrowthProspectInput,
  UpdateGrowthSettingsInput,
} from "@/features/growth/types/growth-dashboard";

type GrowthDashboardState = {
  workspace: GrowthWorkspace | null;
  isLoading: boolean;
  error: string | null;
  currentTab: GrowthPanelTab;
  focusFilter: GrowthFocusFilter;
  isConfigOpen: boolean;
  isAddProspectOpen: boolean;
};

export function useGrowthDashboard() {
  const [state, setState] = useState<GrowthDashboardState>({
    workspace: null,
    isLoading: true,
    error: null,
    currentTab: "resumen",
    focusFilter: "todos",
    isConfigOpen: false,
    isAddProspectOpen: false,
  });
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspace() {
      try {
        const workspace = await growthDashboardService.loadWorkspace();

        if (!isMountedRef.current || cancelled) {
          return;
        }

        setState((current) => ({
          ...current,
          workspace,
          isLoading: false,
          error: null,
        }));
      } catch {
        if (!isMountedRef.current || cancelled) {
          return;
        }

        setState((current) => ({
          ...current,
          workspace: null,
          isLoading: false,
          error: "No pudimos cargar el tablero de growth.",
        }));
      }
    }

    void loadWorkspace();

    return () => {
      cancelled = true;
    };
  }, []);

  const viewModel = useMemo(() => {
    if (!state.workspace) {
      return null;
    }

    return growthDashboardService.buildDashboardViewModel(
      state.workspace,
      state.currentTab,
      state.focusFilter
    );
  }, [state.currentTab, state.focusFilter, state.workspace]);

  async function applyWorkspace(nextWorkspacePromise: Promise<GrowthWorkspace>) {
    const nextWorkspace = await nextWorkspacePromise;

    if (!isMountedRef.current) {
      return;
    }

    setState((current) => ({
      ...current,
      workspace: nextWorkspace,
      error: null,
    }));
  }

  return {
    workspace: state.workspace,
    viewModel,
    isLoading: state.isLoading,
    error: state.error,
    currentTab: state.currentTab,
    focusFilter: state.focusFilter,
    isConfigOpen: state.isConfigOpen,
    isAddProspectOpen: state.isAddProspectOpen,
    setCurrentTab(nextTab: GrowthPanelTab) {
      setState((current) => ({
        ...current,
        currentTab: nextTab,
      }));
    },
    setFocusFilter(nextFilter: GrowthFocusFilter) {
      setState((current) => ({
        ...current,
        focusFilter: nextFilter,
      }));
    },
    openConfig() {
      setState((current) => ({
        ...current,
        isConfigOpen: true,
      }));
    },
    closeConfig() {
      setState((current) => ({
        ...current,
        isConfigOpen: false,
      }));
    },
    openAddProspect() {
      setState((current) => ({
        ...current,
        isAddProspectOpen: true,
      }));
    },
    closeAddProspect() {
      setState((current) => ({
        ...current,
        isAddProspectOpen: false,
      }));
    },
    async addProspect(input: CreateGrowthProspectInput) {
      if (!state.workspace) {
        return;
      }

      await applyWorkspace(
        growthDashboardService.addProspect(state.workspace, input)
      );

      setState((current) => ({
        ...current,
        isAddProspectOpen: false,
        currentTab: "resumen",
      }));
    },
    async updateProspect(prospectId: string, patch: UpdateGrowthProspectInput) {
      if (!state.workspace) {
        return;
      }

      await applyWorkspace(
        growthDashboardService.updateProspect(state.workspace, prospectId, patch)
      );
    },
    async advanceProspect(prospectId: string) {
      if (!state.workspace) {
        return;
      }

      await applyWorkspace(
        growthDashboardService.advanceProspect(state.workspace, prospectId)
      );
    },
    async updateSettings(patch: UpdateGrowthSettingsInput) {
      if (!state.workspace) {
        return;
      }

      await applyWorkspace(
        growthDashboardService.updateSettings(state.workspace, patch)
      );
    },
    async updateManualMetrics(patch: UpdateGrowthManualMetricsInput) {
      if (!state.workspace) {
        return;
      }

      await applyWorkspace(
        growthDashboardService.updateManualMetrics(state.workspace, patch)
      );
    },
    async updateExperiments(experiments: GrowthWorkspace["experiments"]) {
      if (!state.workspace) {
        return;
      }

      await applyWorkspace(
        growthDashboardService.updateExperiments(state.workspace, experiments)
      );
    },
    async resetWorkspace() {
      await applyWorkspace(growthDashboardService.resetWorkspace());

      setState((current) => ({
        ...current,
        currentTab: "resumen",
        focusFilter: "todos",
      }));
    },
  };
}
