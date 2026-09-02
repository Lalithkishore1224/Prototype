import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getChallenge, initDb, updateChallenge } from "@/lib/db";
import type { Challenge } from "@/lib/workflow";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  await initDb();
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const action = body?.action;
  if (action !== "accept" && action !== "reject") return NextResponse.json({ error: "Action must be accept or reject." }, { status: 400 });
  const challenge = await getChallenge(id);
  if (!challenge || !challenge.submissionStatus) return NextResponse.json({ error: "No submitted project found for this problem." }, { status: 404 });
  const status = action === "accept" ? "ACCEPTED" as const : "REJECTED" as const;
  const patched: Challenge = { ...challenge, submissionStatus: status, status: action === "accept" ? "Project accepted" : "Project returned for revision" };
  await updateChallenge(id, patched);
  return NextResponse.json({ challenge: patched });
}
