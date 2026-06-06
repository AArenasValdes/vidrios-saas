import { NextResponse } from "next/server";
import { APP_VERSION } from "@/utils/app-version";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { version: APP_VERSION },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}
