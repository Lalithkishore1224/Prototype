import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { initDb, listChallenges, listUniversities, listStakeholders } from "@/lib/db";

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  await initDb();
  const challenges = await listChallenges();
  const universities = await listUniversities();
  const stakeholders = await listStakeholders();
  return NextResponse.json({ challenges, universities, stakeholders });
}
