describe("mercadopago market config", () => {
  const previousEnvironment = { ...process.env };

  beforeEach(() => {
    process.env = { ...previousEnvironment };
    delete process.env.MERCADOPAGO_BILLING_ENABLED;
    delete process.env.MERCADOPAGO_CL_ACCESS_TOKEN;
    delete process.env.MERCADOPAGO_CL_WEBHOOK_SECRET;
    delete process.env.MERCADOPAGO_CL_FOUNDER_MONTHLY_PLAN_ID;
    delete process.env.MERCADOPAGO_CL_FOUNDER_YEARLY_PLAN_ID;
    delete process.env.MERCADOPAGO_CL_QUOTE_ONLY_YEARLY_PLAN_ID;
    delete process.env.MERCADOPAGO_CL_QUOTE_ONLY_MONTHLY_PLAN_ID;
    delete process.env.MERCADOPAGO_PE_BILLING_ENABLED;
  });

  afterAll(() => {
    process.env = previousEnvironment;
  });

  it("no habilita mercados sin precio comercial deliberado", async () => {
    const { getMercadoPagoMarketReadiness } = await import("../mercadopago-market.config");

    expect(getMercadoPagoMarketReadiness("PE")).toEqual({
      countryCode: "PE",
      currencyCode: "PEN",
      commerciallyConfigured: false,
      ready: false,
    });
  });

  it("solo declara Chile listo con flag, secretos e IDs completos", async () => {
    const { isMercadoPagoMarketBillingReady } = await import("../mercadopago-market.config");

    expect(isMercadoPagoMarketBillingReady("CL")).toBe(false);

    process.env.MERCADOPAGO_BILLING_ENABLED = "true";
    process.env.MERCADOPAGO_CL_ACCESS_TOKEN = "access";
    process.env.MERCADOPAGO_CL_WEBHOOK_SECRET = "secret";
    process.env.MERCADOPAGO_CL_FOUNDER_MONTHLY_PLAN_ID = "monthly";
    process.env.MERCADOPAGO_CL_FOUNDER_YEARLY_PLAN_ID = "yearly";
    process.env.MERCADOPAGO_CL_QUOTE_ONLY_YEARLY_PLAN_ID = "quote-yearly";
    process.env.MERCADOPAGO_CL_QUOTE_ONLY_MONTHLY_PLAN_ID = "quote-monthly";

    expect(isMercadoPagoMarketBillingReady("CL")).toBe(true);
  });
});
