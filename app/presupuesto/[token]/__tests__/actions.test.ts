jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

jest.mock("@/features/cotizaciones/public-approval/services/public-cotizacion-approval.service", () => ({
  publicCotizacionApprovalService: {
    resolveByToken: jest.fn(),
    accept: jest.fn(),
    reject: jest.fn(),
  },
}));

jest.mock("@/features/notificaciones/services/web-push-notifications.service", () => ({
  webPushNotificationsService: {
    sendQuoteDecisionPush: jest.fn(),
  },
}));

import { redirect } from "next/navigation";
import { acceptPublicQuoteAction } from "../actions";
import { publicCotizacionApprovalService } from "@/features/cotizaciones/public-approval/services/public-cotizacion-approval.service";
import { webPushNotificationsService } from "@/features/notificaciones/services/web-push-notifications.service";

describe("public quote actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("codifica el token en el redirect y notifica solo cuando corresponde", async () => {
    (publicCotizacionApprovalService.resolveByToken as jest.Mock).mockResolvedValue({
      canRespond: true,
      isExpired: false,
    });
    (publicCotizacionApprovalService.accept as jest.Mock).mockResolvedValue({
      id: "cot-77",
      organizationId: "org-7",
      codigo: "COT-77",
      clienteNombre: "Ana Soto",
    });

    await acceptPublicQuoteAction("token con/slash");

    expect(webPushNotificationsService.sendQuoteDecisionPush).toHaveBeenCalledWith({
      organizationId: "org-7",
      cotizacionId: "cot-77",
      codigo: "COT-77",
      clienteNombre: "Ana Soto",
      decision: "aprobada",
    });
    expect(redirect).toHaveBeenCalledWith(
      "/presupuesto/token%20con%2Fslash?decision=aceptada"
    );
  });
});
