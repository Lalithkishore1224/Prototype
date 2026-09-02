import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { initDb, listStakeholders, listUniversities, setOrganizationStatus } from "@/lib/db";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  await initDb();
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const status = body?.status === "APPROVED" || body?.status === "REJECTED" ? body.status : null;
  if (!status) return NextResponse.json({ error: "Status must be APPROVED or REJECTED." }, { status: 400 });
  const found = await setOrganizationStatus(id, status);
  if (found === "university") {
    const university = (await listUniversities()).find((item) => item.id === id);
    return NextResponse.json({ university, status });
  }
  if (found === "stakeholder") {
    const stakeholder = (await listStakeholders()).find((item) => item.id === id);
    return NextResponse.json({ stakeholder, status });
  }
  return NextResponse.json({ error: "Organization intake record not found." }, { status: 404 });
}
