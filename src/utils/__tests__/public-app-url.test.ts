import { resolvePublicAppUrl } from "../public-app-url";

describe("public-app-url", () => {
  const originalWindow = global.window;

  afterEach(() => {
    if (originalWindow) {
      global.window = originalWindow;
    } else {
      // @ts-expect-error test cleanup
      delete global.window;
    }
  });

  it("debe usar www.ventorap.cl cuando origen local no sirve para compartir", () => {
    Object.defineProperty(global, "window", {
      value: {
        location: {
          origin: "http://localhost:3000",
          hostname: "localhost",
        },
      },
      configurable: true,
    });

    expect(resolvePublicAppUrl()).toBe("https://www.ventorap.cl");
  });

  it("debe usar origen local cuando se pide preview local", () => {
    Object.defineProperty(global, "window", {
      value: {
        location: {
          origin: "http://localhost:3000",
          hostname: "localhost",
        },
      },
      configurable: true,
    });

    expect(resolvePublicAppUrl({ preferLocal: true })).toBe("http://localhost:3000");
  });
});
