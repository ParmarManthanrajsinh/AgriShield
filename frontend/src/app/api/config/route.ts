import { NextResponse } from "next/server";

export async function GET() {
  const base = process.env.API_BACKEND_URL || "http://localhost:8000";
  return NextResponse.json({ API_BASE: base });
}
