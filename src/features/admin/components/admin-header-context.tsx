"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type AdminHeaderAction = {
  label: string;
  onClick?: () => void;
  href?: string;
};

type AdminHeaderState = {
  syncedAt?: string | null;
  periodDays?: number;
  onPeriodChange?: (days: number) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onNewProspect?: () => void;
  customPrimaryAction?: AdminHeaderAction;
  customSecondaryAction?: AdminHeaderAction;
  customTertiaryAction?: AdminHeaderAction;
  hideDefaultPrimaryActions?: boolean;
};

type AdminHeaderContextValue = AdminHeaderState & {
  setHeaderState: (state: AdminHeaderState) => void;
  resetHeaderState: () => void;
};

const AdminHeaderContext = createContext<AdminHeaderContextValue | null>(null);

export function AdminHeaderProvider({ children }: { children: ReactNode }) {
  const [headerState, setHeaderStateInternal] = useState<AdminHeaderState>({});

  const setHeaderState = useCallback((state: AdminHeaderState) => {
    setHeaderStateInternal(state);
  }, []);

  const resetHeaderState = useCallback(() => {
    setHeaderStateInternal({});
  }, []);

  const value = useMemo<AdminHeaderContextValue>(
    () => ({
      ...headerState,
      setHeaderState,
      resetHeaderState,
    }),
    [headerState, setHeaderState, resetHeaderState]
  );

  return (
    <AdminHeaderContext.Provider value={value}>
      {children}
    </AdminHeaderContext.Provider>
  );
}

export function useAdminHeader() {
  const context = useContext(AdminHeaderContext);

  if (!context) {
    throw new Error("useAdminHeader debe usarse dentro de AdminHeaderProvider.");
  }

  return context;
}

export function useAdminHeaderActions() {
  const { setHeaderState, resetHeaderState } = useAdminHeader();
  return { setHeaderState, resetHeaderState };
}
