import { NextResponse } from "next/server";
import { addStakeholder, initDb, listStakeholders } from "@/lib/db";
import type { Stakeholder } from "@/lib/workflow";

export async function GET() {
  await initDb();
  const stakeholders = await listStakeholders();
  return NextResponse.json({ stakeholders });
}

export async function POST(request: Request) {
  await initDb();
  const body = await request.json().catch(() => null);
  if (!body?.organization || !body?.contact || !body?.type) return NextResponse.json({ error: "Organization, contact email, and stakeholder type are required." }, { status: 400 });
  const stakeholder: Stakeholder = { id: `stake-${Date.now()}`, organization: String(body.organization).trim(), contact: String(body.contact).trim(), type: String(body.type), status: "PENDING" };
  await addStakeholder(stakeholder);
  return NextResponse.json({ stakeholder }, { status: 201 });
}
