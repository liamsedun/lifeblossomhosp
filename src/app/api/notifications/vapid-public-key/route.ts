import { NextResponse } from "next/server";
import { getVapidPublicKey } from "@/lib/push-notifications";

/** GET /api/notifications/vapid-public-key */
export async function GET() {
  return NextResponse.json({ success: true, publicKey: getVapidPublicKey() });
}
