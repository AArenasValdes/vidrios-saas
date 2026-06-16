import { GET } from "../route";

describe("/.well-known/assetlinks.json", () => {
  const originalPackageName = process.env.ANDROID_TWA_PACKAGE_NAME;
  const originalFingerprints = process.env.ANDROID_TWA_SHA256_CERT_FINGERPRINTS;

  afterEach(() => {
    process.env.ANDROID_TWA_PACKAGE_NAME = originalPackageName;
    process.env.ANDROID_TWA_SHA256_CERT_FINGERPRINTS = originalFingerprints;
  });

  it("publica Digital Asset Links cuando existe huella SHA-256 configurada", async () => {
    process.env.ANDROID_TWA_PACKAGE_NAME = "cl.ventorap.test";
    process.env.ANDROID_TWA_SHA256_CERT_FINGERPRINTS =
      "AA:BB:CC, 11:22:33";

    const response = GET();
    const body = await response.json();

    expect(response.headers.get("cache-control")).toBe("public, max-age=3600");
    expect(body).toEqual([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "cl.ventorap.test",
          sha256_cert_fingerprints: ["AA:BB:CC", "11:22:33"],
        },
      },
    ]);
  });

  it("no declara una relacion Android sin huella real", async () => {
    process.env.ANDROID_TWA_PACKAGE_NAME = "cl.ventorap.test";
    delete process.env.ANDROID_TWA_SHA256_CERT_FINGERPRINTS;

    const response = GET();

    expect(await response.json()).toEqual([]);
  });
});
