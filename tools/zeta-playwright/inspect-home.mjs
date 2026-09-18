import { chromium } from "@playwright/test";
import path from "node:path";

const root = process.cwd();
const profileDir = path.join(root, "tools", "zeta-playwright", ".zeta-profile");

const context = await chromium.launchPersistentContext(profileDir, { headless: true });
const page = await context.newPage();

const failedResponses = [];
page.on("response", (response) => {
  if (response.status() >= 400) {
    failedResponses.push({ status: response.status(), method: response.request().method(), url: response.url() });
  }
});

await page.goto("https://sistemazeta.cl/zeta/proyectos", { waitUntil: "domcontentloaded", timeout: 45000 });
await page.waitForTimeout(1500);

const text = (await page.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ").trim();
const buttons = await page.locator("button").evaluateAll((nodes) => nodes.map((node) => ({ text: node.innerText.trim(), aria: node.getAttribute("aria-label"), disabled: node.disabled })).slice(0, 80));
const links = await page.locator("a").evaluateAll((nodes) => nodes.map((node) => ({ text: node.innerText.trim(), href: node.href })).slice(0, 80));
const inputs = await page.locator("input, select, textarea").evaluateAll((nodes) => nodes.map((node) => ({ tag: node.tagName, type: node.getAttribute("type"), name: node.getAttribute("name"), placeholder: node.getAttribute("placeholder"), aria: node.getAttribute("aria-label"), value: node.value })).slice(0, 80));

console.log(JSON.stringify({
  url: page.url(),
  title: await page.title(),
  bodyText: text.slice(0, 8000),
  buttons,
  links,
  inputs,
  failedResponses,
}, null, 2));

await context.close();
