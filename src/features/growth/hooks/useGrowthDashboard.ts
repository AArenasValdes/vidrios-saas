"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { growthApiClient } from "@/features/growth/client/growth-api.client";
import { growthDashboardService } from "@/features/growth/services/growth-dashboard.service";
import type {
  CreateGrowthClientInput,
  CreateGrowthMarketingTaskInput,
  CreateGrowthProspectInput,
  GrowthPanelTab,
  GrowthTodayItem,
  GrowthWorkspace,
  UpdateGrowthClientInput,
  UpdateGrowthManualMetricsInput,
  UpdateGrowthMarketingTaskInput,
  UpdateGrowthProspectInput,
  UpdateGrowthSettingsInput,
} from "@/features/growth/types/growth-dashboard";
import type { GrowthImportResult } from "@/features/growth/types/growth-supabase";

type GrowthDashboardState = {
  workspace: GrowthWorkspace | null;
  workToday: GrowthTodayItem[] | null;
  realMetrics: {
    mrrClp: number;
    arrClp: number;
    activeCustomers: number;
    trialCustomers: number;
  } | null;
  isLoading: boolean;
  error: string | null;
  currentTab: GrowthPanelTab;
  isConfigOpen: boolean;
  isAddProspectOpen: boolean;
  importSummary: GrowthImportResult | null;
  isImportOpen: boolean;
};

export function useGrowthDashboard() {
  const [state, setState] = useState<GrowthDashboardState>({
    workspace: null,
    workToday: null,
    realMetrics: null,
    isLoading: true,
    error: null,
    currentTab: "trabajo",
    isConfigOpen: false,
    isAddProspectOpen: false,
    importSummary: null,
    isImportOpen: false,
  });
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const reload = useCallback(async () => {
    const [workspaceResult, workToday] = await Promise.all([
      growthApiClient.loadWorkspace(),
      growthApiClient.loadWorkToday(),
    ]);

    if (!isMountedRef.current) return;

    setState((current) => ({
      ...current,
      workspace: workspaceResult.workspace,
      workToday,
      realMetrics: workspaceResult.realMetrics,
      isLoading: false,
      error: null,
    }));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        await reload();
      } catch (loadError) {
        if (!cancelled && isMountedRef.current) {
          setState((current) => ({
            ...current,
            workspace: null,
            workToday: null,
            realMetrics: null,
            isLoading: false,
            error:
              loadError instanceof Error
                ? loadError.message
                : "No pudimos cargar el panel de fundador.",
          }));
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [reload]);

  const viewModel = useMemo(() => {
    if (!state.workspace) {
      return null;
    }

    const base = growthDashboardService.buildDashboardViewModel(
      state.workspace,
      state.currentTab
    );

    if (state.workToday) {
      return { ...base, workToday: state.workToday, realMetrics: state.realMetrics };
    }

    return base;
  }, [state.currentTab, state.workspace, state.workToday, state.realMetrics]);

  async function refreshAfterMutation(nextWorkspace?: GrowthWorkspace) {
    if (nextWorkspace) {
      const workToday = await growthApiClient.loadWorkToday();
      if (!isMountedRef.current) return;
      setState((current) => ({
        ...current,
        workspace: nextWorkspace,
        workToday,
        error: null,
      }));
      return;
    }

    await reload();
  }

  return {
    workspace: state.workspace,
    viewModel,
    isLoading: state.isLoading,
    error: state.error,
    reload,
    currentTab: state.currentTab,
    isConfigOpen: state.isConfigOpen,
    isAddProspectOpen: state.isAddProspectOpen,
    isAddClientOpen: false,
    isAddMarketingOpen: false,
    importSummary: state.importSummary,
    isImportOpen: state.isImportOpen,
    setCurrentTab(nextTab: GrowthPanelTab) {
      setState((current) => ({ ...current, currentTab: nextTab }));
    },
    jumpToWorkQueue(targetTab: GrowthPanelTab) {
      setState((current) => ({ ...current, currentTab: targetTab }));
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
    openAddClient() {},
    closeAddClient() {},
    openAddMarketing() {},
    closeAddMarketing() {},
    openImport() {
      setState((current) => ({ ...current, isImportOpen: true }));
    },
    closeImport() {
      setState((current) => ({ ...current, isImportOpen: false }));
    },
    async addProspect(input: CreateGrowthProspectInput) {
      await growthApiClient.addProspect(input);
      await reload();
      setState((current) => ({
        ...current,
        isAddProspectOpen: false,
        currentTab: "prospectos",
      }));
    },
    async updateProspect(prospectId: string, patch: UpdateGrowthProspectInput) {
      await growthApiClient.updateProspect(prospectId, patch);
      await reload();
    },
    async advanceProspect(prospectId: string) {
      await growthApiClient.advanceProspect(prospectId);
      await reload();
    },
    async deleteProspect(prospectId: string) {
      const workspace = await growthApiClient.deleteProspect(prospectId);
      await refreshAfterMutation(workspace);
    },
    async registerContact(
      prospectId: string,
      input: { canal?: string; contenido?: string }
    ) {
      await growthApiClient.registerContact(prospectId, input);
      await reload();
    },
    async addClient(_input: CreateGrowthClientInput) {},
    async updateClient(_clientId: string, _patch: UpdateGrowthClientInput) {},
    async deleteClient(_clientId: string) {},
    async addMarketingTask(_input: CreateGrowthMarketingTaskInput) {},
    async updateMarketingTask(
      _taskId: string,
      _patch: UpdateGrowthMarketingTaskInput
    ) {},
    async deleteMarketingTask(_taskId: string) {},
    async updateSettings(patch: UpdateGrowthSettingsInput) {
      const workspace = await growthApiClient.updateSettings(patch);
      await refreshAfterMutation(workspace);
    },
    async updateManualMetrics(patch: UpdateGrowthManualMetricsInput) {
      const workspace = await growthApiClient.updateManualMetrics(patch);
      await refreshAfterMutation(workspace);
    },
    async importLocalWorkspace(workspace: GrowthWorkspace) {
      const { result, workspace: nextWorkspace } =
        await growthApiClient.importLocalWorkspace(workspace);
      await refreshAfterMutation(nextWorkspace);
      setState((current) => ({
        ...current,
        importSummary: result,
        isImportOpen: false,
      }));
      return result;
    },
    async importSpreadsheet(file: File) {
      const { result, workspace: nextWorkspace } =
        await growthApiClient.importSpreadsheet(file);
      await refreshAfterMutation(nextWorkspace);
      setState((current) => ({
        ...current,
        importSummary: result,
      }));
      return result;
    },
    async resetWorkspace() {
      setState((current) => ({
        ...current,
        error: "El reset local ya no aplica. Los datos viven en Supabase.",
      }));
    },
  };
}
