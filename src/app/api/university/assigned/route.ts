import { NextResponse } from "next/server";
import { requireUniversity } from "@/lib/auth";
import { initDb, listAssignedChallenges } from "@/lib/db";

export async function GET() {
  const session = await requireUniversity();
  if (!session?.universityId) return NextResponse.json({ error: "University sign in required." }, { status: 401 });
  await initDb();
  const challenges = await listAssignedChallenges(session.universityId);
  return NextResponse.json({ university: { id: session.universityId, name: session.universityName }, challenges });
}
