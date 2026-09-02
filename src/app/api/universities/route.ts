import { NextResponse } from "next/server";
import { addUniversity, initDb, listUniversities } from "@/lib/db";
import type { University } from "@/lib/workflow";

export async function GET() {
  await initDb();
  const universities = await listUniversities();
  return NextResponse.json({ universities });
}

export async function POST(request: Request) {
  await initDb();
  const body = await request.json().catch(() => null);
  if (!body?.name || !body?.email || !body?.focus || !body?.city || !body?.description || !body?.teamCapacity || !body?.solutionTypes) return NextResponse.json({ error: "Institution, city, focus, description, student capacity, solution type, and official email are required." }, { status: 400 });
  const solutionTypes = Array.isArray(body.solutionTypes) ? body.solutionTypes[0] : body.solutionTypes;
  if (!["SOFTWARE", "HARDWARE", "BOTH"].includes(solutionTypes)) return NextResponse.json({ error: "Choose software, hardware, or both." }, { status: 400 });
  const university: University = { id: `uni-${Date.now()}`, name: String(body.name).trim(), city: String(body.city).trim(), focus: String(body.focus).trim(), description: String(body.description).trim(), email: String(body.email).trim(), teamCapacity: Math.max(1, Number(body.teamCapacity)), solutionTypes: solutionTypes as "SOFTWARE" | "HARDWARE" | "BOTH", status: "PENDING" };
  await addUniversity(university);
  return NextResponse.json({ university }, { status: 201 });
}
