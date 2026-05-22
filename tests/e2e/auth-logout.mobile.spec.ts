import { expect, test } from "@playwright/test";

const e2eEmail = process.env.PLAYWRIGHT_E2E_EMAIL;
const e2ePassword = process.env.PLAYWRIGHT_E2E_PASSWORD;

test.describe("logout movil", () => {
  test.skip(
    !e2eEmail || !e2ePassword,
    "Faltan PLAYWRIGHT_E2E_EMAIL y/o PLAYWRIGHT_E2E_PASSWORD."
  );

  test("login -> dashboard -> logout -> login -> ruta privada bloqueada", async ({
    page,
  }) => {
    await page.goto("/auth/logout");
    await page.goto("/login");

    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();

    await page.getByLabel("Email").fill(e2eEmail ?? "");
    await page.getByLabel("Password").fill(e2ePassword ?? "");
    await page.getByRole("button", { name: "Iniciar sesion" }).click();

    await page.waitForURL(/\/dashboard(?:\?.*)?$/);
    await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/);

    await page.getByLabel("Abrir menu de cuenta").click();
    await expect(page.getByRole("button", { name: "Cerrar sesion" })).toBeVisible();
    await page.getByRole("button", { name: "Cerrar sesion" }).click();

    await page.waitForURL(/\/login(?:\?.*)?$/);
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByRole("button", { name: "Iniciar sesion" })).toBeVisible();

    await page.goto("/dashboard");
    await page.waitForURL(/\/login\?next=%2Fdashboard$/);
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
    await expect(page.getByLabel("Email")).toBeVisible();
  });

  test("logout movil resiste refresh y sigue fuera de rutas privadas", async ({
    page,
  }) => {
    await page.goto("/auth/logout");
    await page.goto("/login");

    await page.getByLabel("Email").fill(e2eEmail ?? "");
    await page.getByLabel("Password").fill(e2ePassword ?? "");
    await page.getByRole("button", { name: "Iniciar sesion" }).click();

    await page.waitForURL(/\/dashboard(?:\?.*)?$/);
    await page.getByLabel("Abrir menu de cuenta").click();
    await page.getByRole("button", { name: "Cerrar sesion" }).click();

    await page.waitForURL(/\/login(?:\?.*)?$/);
    await page.reload();

    await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
    await expect(page.getByLabel("Email")).toBeVisible();

    await page.goto("/dashboard");
    await page.waitForURL(/\/login\?next=%2Fdashboard$/);
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
  });
});
