import {
  assertSubscriptionAllowsWrite,
  buildPlanContractWhatsappHref,
  canAccessPrivatePathWithSubscription,
  resolveOrganizationSubscriptionState,
  SubscriptionWriteAccessError,
} from "../subscription-status.service";

describe("subscription-status.service", () => {
  const now = new Date("2026-05-25T12:00:00.000Z");

  it("marca trial activo cuando aun quedan mas de 3 dias", () => {
    const state = resolveOrganizationSubscriptionState(
      {
        subscriptionStatus: "trial_active",
        trialStartedAt: "2026-05-24T12:00:00.000Z",
        trialEndsAt: "2026-05-31T12:00:00.000Z",
        planType: "trial",
      },
      now
    );

    expect(state.effectiveStatus).toBe("trial_active");
    expect(state.isWriteBlocked).toBe(false);
    expect(state.daysRemaining).toBe(6);
  });

  it("marca trial por vencer cuando quedan 3 dias o menos", () => {
    const state = resolveOrganizationSubscriptionState(
      {
        subscriptionStatus: "trial_active",
        trialStartedAt: "2026-05-20T12:00:00.000Z",
        trialEndsAt: "2026-05-28T12:00:00.000Z",
        planType: "trial",
      },
      now
    );

    expect(state.effectiveStatus).toBe("trial_expiring");
    expect(state.shouldShowTrialBanner).toBe(true);
    expect(state.daysRemaining).toBe(3);
  });

  it("marca trial vencido si no hay suscripcion activa y ya paso la fecha", () => {
    const state = resolveOrganizationSubscriptionState(
      {
        subscriptionStatus: "trial_active",
        trialStartedAt: "2026-05-10T12:00:00.000Z",
        trialEndsAt: "2026-05-20T12:00:00.000Z",
        planType: "trial",
      },
      now
    );

    expect(state.effectiveStatus).toBe("trial_expired");
    expect(state.isWriteBlocked).toBe(true);
    expect(state.shouldShowExpiredBanner).toBe(true);
  });

  it("mantiene activa una cuenta founder sin fecha de termino", () => {
    const state = resolveOrganizationSubscriptionState(
      {
        subscriptionStatus: "active",
        planType: "founder",
        subscriptionStartedAt: "2026-05-01T12:00:00.000Z",
        subscriptionEndsAt: null,
        founderPriceLocked: true,
      },
      now
    );

    expect(state.effectiveStatus).toBe("active");
    expect(state.isWriteBlocked).toBe(false);
  });

  it("bloquea rutas de escritura cuando la cuenta esta vencida pero deja lectura basica", () => {
    const state = resolveOrganizationSubscriptionState(
      {
        subscriptionStatus: "trial_expired",
        trialEndsAt: "2026-05-20T12:00:00.000Z",
        planType: "trial",
      },
      now
    );

    expect(canAccessPrivatePathWithSubscription("/cotizaciones", state)).toBe(true);
    expect(canAccessPrivatePathWithSubscription("/cotizaciones/nueva", state)).toBe(false);
    expect(canAccessPrivatePathWithSubscription("/configuracion/empresa", state)).toBe(false);
  });

  it("lanza error de escritura cuando la cuenta ya no puede operar", () => {
    const state = resolveOrganizationSubscriptionState(
      {
        subscriptionStatus: "past_due",
        subscriptionEndsAt: "2026-05-20T12:00:00.000Z",
        planType: "monthly",
      },
      now
    );

    expect(() => assertSubscriptionAllowsWrite(state)).toThrow(
      SubscriptionWriteAccessError
    );
  });

  it("mantiene operativa una cuenta past_due durante el periodo de gracia", () => {
    const state = resolveOrganizationSubscriptionState(
      {
        subscriptionStatus: "past_due",
        subscriptionEndsAt: "2026-05-24T12:00:00.000Z",
        planType: "monthly",
      },
      now
    );

    expect(state.effectiveStatus).toBe("past_due");
    expect(state.isInPaymentGracePeriod).toBe(true);
    expect(state.isWriteBlocked).toBe(false);
    expect(state.paymentGraceEndsAt).toBe("2026-05-27T12:00:00.000Z");
  });

  it("arma el enlace de WhatsApp con el plan elegido", () => {
    const href = buildPlanContractWhatsappHref({
      planLabel: "Founder Full Anual",
      companyName: "Vidrios del Sur",
    });

    expect(href).toContain("https://wa.me/56987654321?text=");
    expect(decodeURIComponent(href.split("text=")[1] ?? "")).toBe(
      "Hola, quiero contratar el plan: Founder Full Anual. Mi empresa es Vidrios del Sur."
    );
  });
});
