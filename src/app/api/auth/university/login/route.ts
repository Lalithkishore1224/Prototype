import { NextResponse } from "next/server";
import { createUniversitySession } from "@/lib/auth";
import { initDb, listUniversities } from "@/lib/db";

export async function POST(request: Request) {
  await initDb();
  const body = await request.json().catch(() => null);
  const id = String(body?.universityId || "");
  if (!id) return NextResponse.json({ error: "Choose your institution." }, { status: 400 });
  const universities = await listUniversities();
  const university = universities.find((item) => item.id === id && item.status === "APPROVED");
  if (!university) return NextResponse.json({ error: "Select an approved institution." }, { status: 400 });
  await createUniversitySession({ id: university.id, name: university.name, email: university.email });
  return NextResponse.json({ university: { id: university.id, name: university.name, email: university.email, city: university.city } });
}
