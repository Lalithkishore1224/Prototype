import { NextResponse } from "next/server";
import { getStats, initDb } from "@/lib/db";

export async function GET() {
  await initDb();
  const stats = await getStats();
  return NextResponse.json({ stats });
}
