import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/internalAuth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/restricted", req.url));
  res.cookies.delete(COOKIE_NAME);
  return res;
}
