jest.mock(
  "@/features/subscriptions/repositories/pago-suscripcion.repository",
  () => {
    const repository = {
      getByProviderToken: jest.fn(),
      getByBuyOrder: jest.fn(),
      markPendingAsFailed: jest.fn(),
    };

    return {
      createPagoSuscripcionRepository: () => repository,
      __repository: repository,
    };
  }
);

import * as mockedRepositoryModule from "@/features/subscriptions/repositories/pago-suscripcion.repository";
import { createWebpaySuscripcionService } from "../webpay-suscripcion.service";

const repositoryMocks = (
  mockedRepositoryModule as typeof mockedRepositoryModule & {
    __repository: {
      getByProviderToken: jest.Mock;
      getByBuyOrder: jest.Mock;
      markPendingAsFailed: jest.Mock;
    };
  }
).__repository;
const mockGetByBuyOrder = repositoryMocks.getByBuyOrder;
const mockMarkPendingAsFailed = repositoryMocks.markPendingAsFailed;

const pendingPayment = {
  id: 91,
  organization_id: 7,
  buy_order: "VTORDER123",
  status: "pendiente",
};

describe("Webpay retorno incompleto", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetByBuyOrder.mockResolvedValue(pendingPayment);
    mockMarkPendingAsFailed.mockResolvedValue(true);
  });

  it("no muta un pago cuando llega solo la orden", async () => {
    const service = createWebpaySuscripcionService();

    await service.registrarRetornoIncompleto({
      buyOrder: "VTORDER123",
      reason: "TIMEOUT",
      rawParams: { TBK_ORDEN_COMPRA: "VTORDER123" },
    });

    expect(mockGetByBuyOrder).not.toHaveBeenCalled();
    expect(mockMarkPendingAsFailed).not.toHaveBeenCalled();
  });

  it("muta de forma atomica solo con orden y sesion correlacionadas", async () => {
    const service = createWebpaySuscripcionService();

    await service.registrarRetornoIncompleto({
      buyOrder: "VTORDER123",
      sessionId: "7",
      reason: "TIMEOUT",
      rawParams: {
        TBK_ORDEN_COMPRA: "VTORDER123",
        TBK_ID_SESION: "7",
      },
    });

    expect(mockGetByBuyOrder).toHaveBeenCalledWith("VTORDER123");
    expect(mockMarkPendingAsFailed).toHaveBeenCalledWith(
      expect.objectContaining({ id: 91, providerStatus: "TIMEOUT" })
    );
  });

  it("rechaza una sesion ajena", async () => {
    const service = createWebpaySuscripcionService();

    await service.registrarRetornoIncompleto({
      buyOrder: "VTORDER123",
      sessionId: "99",
      reason: "TIMEOUT",
      rawParams: {},
    });

    expect(mockMarkPendingAsFailed).not.toHaveBeenCalled();
  });
});
