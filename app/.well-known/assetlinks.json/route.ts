import { NextResponse } from "next/server";

const DEFAULT_ANDROID_PACKAGE_NAME = "cl.ventorap.app";

function parseFingerprints(value: string | undefined) {
  return (value ?? "")
    .split(/[\n,]+/)
    .map((fingerprint) => fingerprint.trim())
    .filter(Boolean);
}

export function GET() {
  const packageName =
    process.env.ANDROID_TWA_PACKAGE_NAME?.trim() || DEFAULT_ANDROID_PACKAGE_NAME;
  const fingerprints = parseFingerprints(
    process.env.ANDROID_TWA_SHA256_CERT_FINGERPRINTS
  );

  const body =
    fingerprints.length > 0
      ? [
          {
            relation: ["delegate_permission/common.handle_all_urls"],
            target: {
              namespace: "android_app",
              package_name: packageName,
              sha256_cert_fingerprints: fingerprints,
            },
          },
        ]
      : [];

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, max-age=3600",
    },
  });
}
