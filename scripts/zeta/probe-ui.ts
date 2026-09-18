import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { chromium } from "@playwright/test";

import { ensureDir } from "./paths.ts";
import { zetaBaseUrl } from "./config.ts";

async function main(): Promise<void> {
  const out = join(process.cwd(), "tmp", "zeta-probe");
  await ensureDir(out);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto(zetaBaseUrl(), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(3_000);
    const url = page.url();
    const title = await page.title();
    const body = await page.locator("body").innerText().catch(() => "");
    const html = await page.content();
    await writeFile(join(out, "url.txt"), url, "utf8");
    await writeFile(join(out, "title.txt"), title, "utf8");
    await writeFile(join(out, "body.txt"), body.slice(0, 8000), "utf8");
    await writeFile(join(out, "page.html"), html.slice(0, 200_000), "utf8");
    const inputs = await page
      .locator("input, button, a, select, [role='combobox']")
      .evaluateAll((elements) =>
        elements.slice(0, 120).map((element) => ({
          tag: element.tagName,
          type: element.getAttribute("type"),
          id: element.id,
          name: element.getAttribute("name"),
          className: element.className?.toString().slice(0, 120),
          text: (element.textContent ?? "").trim().slice(0, 80),
          placeholder: element.getAttribute("placeholder"),
          href: element.getAttribute("href"),
          role: element.getAttribute("role"),
          ariaLabel: element.getAttribute("aria-label"),
        })),
      );
    await writeFile(join(out, "elements.json"), `${JSON.stringify(inputs, null, 2)}\n`, "utf8");
    console.log(`url=${url}`);
    console.log(`title=${title}`);
    console.log(`elements=${inputs.length}`);
  } finally {
    await browser.close();
  }
}

await main();
