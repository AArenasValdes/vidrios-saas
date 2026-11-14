import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

const widths = [320, 360, 375, 390];

test("quote profile costs remain readable at narrow mobile widths", async ({ page }, testInfo) => {
  const cssPath = path.join(
    process.cwd(),
    "src/features/proveedor-catalogos/components/quote-profile-costs.module.css"
  );
  const css = await readFile(cssPath, "utf8");

  for (const width of widths) {
    await page.setViewportSize({ width, height: 844 });
    await page.setContent(`<!doctype html>
      <html lang="es"><head><meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>*{box-sizing:border-box}html,body{margin:0;width:100%;font-family:Arial,sans-serif}main{width:100%;padding:8px}</style>
      <style>${css}</style></head>
      <body><main>
        <section class="root" aria-label="Mis costos de perfiles">
          <header class="heading"><div><h3>Mis costos de perfiles</h3><p>4 de 7 perfiles con costo</p></div></header>
          <p class="scopeNotice">Elegir costo propio cambia el proveedor de toda esta pieza. Perfiles sin costo propio quedarán pendientes.</p>
          <ul class="list"><li class="row">
            <div class="identity"><strong>2511R · Refuerzo pierna abierta</strong><small>Código técnico de receta · Acabado cotizado: Blanco · 6.000 mm por tira</small></div>
            <div class="cost"><strong class="referencePrice">$ 45.000</strong><small>Referencia Titanio; no confirma costo físico para Blanco.</small></div>
            <button class="action" type="button">Usar costo propio en esta pieza</button>
          </li></ul>
        </section>
      </main></body></html>`);

    const dimensions = await page.evaluate(() => {
      const root = document.querySelector(".root")!.getBoundingClientRect();
      const action = document.querySelector(".action")!.getBoundingClientRect();
      return {
        viewport: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        rootWidth: root.width,
        actionWidth: action.width,
        actionHeight: action.height,
        rootRight: root.right,
      };
    });

    expect(dimensions.viewport).toBe(width);
    expect(dimensions.documentWidth).toBe(width);
    expect(dimensions.rootRight).toBeLessThanOrEqual(width);
    expect(dimensions.actionWidth).toBeGreaterThanOrEqual(200);
    expect(dimensions.actionHeight).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: testInfo.outputPath(`quote-profile-costs-${width}.png`) });
  }
});
