"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { growthDashboardService } from "@/features/growth/services/growth-dashboard.service";
import type {
  CreateGrowthClientInput,
  CreateGrowthMarketingTaskInput,
  CreateGrowthProspectInput,
  GrowthPanelTab,
  GrowthWorkspace,
  UpdateGrowthClientInput,
  UpdateGrowthManualMetricsInput,
  UpdateGrowthMarketingTaskInput,
  UpdateGrowthProspectInput,
  UpdateGrowthSettingsInput,
} from "@/features/growth/types/growth-dashboard";

type GrowthDashboardState = {
  workspace: GrowthWorkspace | null;
  isLoading: boolean;
  error: string | null;
  currentTab: GrowthPanelTab;
  isConfigOpen: boolean;
  isAddProspectOpen: boolean;
  isAddClientOpen: boolean;
  isAddMarketingOpen: boolean;
};

export function useGrowthDashboard() {
  const [state, setState] = useState<GrowthDashboardState>({
    workspace: null,
    isLoading: true,
    error: null,
    currentTab: "trabajo",
    isConfigOpen: false,
    isAddProspectOpen: false,
    isAddClientOpen: false,
    isAddMarketingOpen: false,
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
          error: "No pudimos cargar el panel de fundador.",
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
      state.currentTab
    );
  }, [state.currentTab, state.workspace]);

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
    isConfigOpen: state.isConfigOpen,
    isAddProspectOpen: state.isAddProspectOpen,
    isAddClientOpen: state.isAddClientOpen,
    isAddMarketingOpen: state.isAddMarketingOpen,
    setCurrentTab(nextTab: GrowthPanelTab) {
      setState((current) => ({
        ...current,
        currentTab: nextTab,
      }));
    },
    jumpToWorkQueue(targetTab: GrowthPanelTab) {
      setState((current) => ({
        ...current,
        currentTab: targetTab,
      }));
    },
    openConfig() {
      setState((current) => ({ ...current, isConfigOpen: true }));
    },
    closeConfig() {
      setState((current) => ({ ...current, isConfigOpen: false }));
    },
    openAddProspect() {
      setState((current) => ({ ...current, isAddProspectOpen: true }));
    },
    closeAddProspect() {
      setState((current) => ({ ...current, isAddProspectOpen: false }));
    },
    openAddClient() {
      setState((current) => ({ ...current, isAddClientOpen: true }));
    },
    closeAddClient() {
      setState((current) => ({ ...current, isAddClientOpen: false }));
    },
    openAddMarketing() {
      setState((current) => ({ ...current, isAddMarketingOpen: true }));
    },
    closeAddMarketing() {
      setState((current) => ({ ...current, isAddMarketingOpen: false }));
    },
    async addProspect(input: CreateGrowthProspectInput) {
      if (!state.workspace) return;

      await applyWorkspace(
        growthDashboardService.addProspect(state.workspace, input)
      );

      setState((current) => ({
        ...current,
        isAddProspectOpen: false,
        currentTab: "prospectos",
      }));
    },
    async updateProspect(prospectId: string, patch: UpdateGrowthProspectInput) {
      if (!state.workspace) return;

      await applyWorkspace(
        growthDashboardService.updateProspect(state.workspace, prospectId, patch)
      );
    },
    async advanceProspect(prospectId: string) {
      if (!state.workspace) return;

      await applyWorkspace(
        growthDashboardService.advanceProspect(state.workspace, prospectId)
      );
    },
    async deleteProspect(prospectId: string) {
      if (!state.workspace) return;

      await applyWorkspace(
        growthDashboardService.deleteProspect(state.workspace, prospectId)
      );
    },
    async addClient(input: CreateGrowthClientInput) {
      if (!state.workspace) return;

      await applyWorkspace(
        growthDashboardService.addClient(state.workspace, input)
      );

      setState((current) => ({
        ...current,
        isAddClientOpen: false,
        currentTab: "clientes",
      }));
    },
    async updateClient(clientId: string, patch: UpdateGrowthClientInput) {
      if (!state.workspace) return;

      await applyWorkspace(
        growthDashboardService.updateClient(state.workspace, clientId, patch)
      );
    },
    async deleteClient(clientId: string) {
      if (!state.workspace) return;

      await applyWorkspace(
        growthDashboardService.deleteClient(state.workspace, clientId)
      );
    },
    async addMarketingTask(input: CreateGrowthMarketingTaskInput) {
      if (!state.workspace) return;

      await applyWorkspace(
        growthDashboardService.addMarketingTask(state.workspace, input)
      );

      setState((current) => ({
        ...current,
        isAddMarketingOpen: false,
        currentTab: "marketing",
      }));
    },
    async updateMarketingTask(
      taskId: string,
      patch: UpdateGrowthMarketingTaskInput
    ) {
      if (!state.workspace) return;

      await applyWorkspace(
        growthDashboardService.updateMarketingTask(state.workspace, taskId, patch)
      );
    },
    async deleteMarketingTask(taskId: string) {
      if (!state.workspace) return;

      await applyWorkspace(
        growthDashboardService.deleteMarketingTask(state.workspace, taskId)
      );
    },
    async updateSettings(patch: UpdateGrowthSettingsInput) {
      if (!state.workspace) return;

      await applyWorkspace(
        growthDashboardService.updateSettings(state.workspace, patch)
      );
    },
    async updateManualMetrics(patch: UpdateGrowthManualMetricsInput) {
      if (!state.workspace) return;

      await applyWorkspace(
        growthDashboardService.updateManualMetrics(state.workspace, patch)
      );
    },
    async resetWorkspace() {
      await applyWorkspace(growthDashboardService.resetWorkspace());

      setState((current) => ({
        ...current,
        currentTab: "trabajo",
      }));
    },
  };
}
