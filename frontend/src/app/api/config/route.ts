import { NextResponse } from "next/server";

export async function GET() {
  const base = process.env.NEXT_PUBLIC_API_URL || process.env.API_BACKEND_URL || "https://agrishield-production.up.railway.app";
  return NextResponse.json({ API_BASE: base });
}
