import { execSync } from "child_process";

import { resolveBuildVersion } from "../next.config";

describe("next config build version", () => {
  const buildDate = new Date("2026-06-07T12:00:00.000Z");

  it("debe priorizar VERCEL_GIT_COMMIT_SHA sobre cualquier conteo git local", () => {
    const exec = jest.fn(() => "10") as unknown as typeof execSync;

    expect(
      resolveBuildVersion({
        env: {
          VERCEL_GIT_COMMIT_SHA: "abcdef1234567890",
        },
        now: buildDate,
        exec,
      })
    ).toBe("v2026.06.07-abcdef1");
    expect(exec).not.toHaveBeenCalled();
  });

  it("debe usar git rev-parse local como fallback fuera de Vercel", () => {
    const exec = jest.fn(() => "1234567890\n") as unknown as typeof execSync;

    expect(
      resolveBuildVersion({
        env: {},
        now: buildDate,
        exec,
      })
    ).toBe("v2026.06.07-1234567");
    expect(exec).toHaveBeenCalledWith("git rev-parse --short HEAD", {
      encoding: "utf-8",
      timeout: 5000,
    });
  });

  it("debe caer a dev si no hay SHA ni git disponible", () => {
    const exec = jest.fn(() => {
      throw new Error("git unavailable");
    }) as unknown as typeof execSync;

    expect(
      resolveBuildVersion({
        env: {},
        now: buildDate,
        exec,
      })
    ).toBe("dev");
  });
});
