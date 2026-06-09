import type {
  AdminClientListItem,
  AdminClientPayment,
} from "@/features/admin/types/admin-client";

export type AdminSummary = {
  clientesActivos: number;
  clientesEnTrial: number;
  trialsPorVencerEstaSemana: number;
  pagosPendientes: number;
  mrrEstimadoClp: number;
  arrEstimadoClp: number;
  clientesRecientes: AdminClientListItem[];
  trialsUrgentes: AdminClientListItem[];
  pagosRecientes: AdminClientPayment[];
};
