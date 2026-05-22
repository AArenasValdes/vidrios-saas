import fs from "fs";
import path from "path";

describe("service worker navigation boundaries", () => {
  it("solo trata rutas publicas como navegacion cacheable del app shell", () => {
    const swPath = path.resolve(__dirname, "../../../../public/sw.js");
    const content = fs.readFileSync(swPath, "utf8");
    const publicRoutesMatch = content.match(
      /const PUBLIC_NAVIGATION_ROUTES = new Set\((\[[^\)]*\])\);/
    );

    expect(publicRoutesMatch).not.toBeNull();
    expect(publicRoutesMatch?.[1]).toBe('["/", "/login", "/planes", "/offline"]');
    expect(content).toContain("if (event.request.mode === \"navigate\") {");
    expect(content).toContain("if (isPublicNavigation(requestUrl.pathname)) {");
    expect(content).toContain("event.respondWith(networkFirstNavigation(event.request));");
  });
});
