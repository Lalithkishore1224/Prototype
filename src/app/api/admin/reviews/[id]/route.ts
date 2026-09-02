import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { evaluateChallenge } from "@/lib/ai";
import { deleteChallenge, initDb, listChallenges, listUniversities, updateChallenge } from "@/lib/db";
import type { Challenge } from "@/lib/workflow";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  await initDb();
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const challenges = await listChallenges();
  const challenge = challenges.find((item) => item.id === id);
  if (!challenge) return NextResponse.json({ error: "Challenge not found." }, { status: 404 });
  if (body?.action !== "approve" && body?.action !== "reassign" && body?.action !== "re_evaluate") return NextResponse.json({ error: "Action must be approve, reassign, or re_evaluate." }, { status: 400 });

  if (body.action === "re_evaluate") {
    const adminContext = String(body.adminContext ?? "").trim();
    const universities = await listUniversities();
    const evaluation = await evaluateChallenge({ ...challenge, adminContext }, universities);
    const updatedForReEval: Challenge = {
      ...challenge,
      adminContext,
      aiAssignedUniversityId: evaluation.university.id,
      aiAssignedUniversityName: evaluation.university.name,
      solutionType: evaluation.solutionType,
      teamSize: evaluation.teamSize,
      confidence: evaluation.confidence,
      aiRationale: evaluation.rationale,
      status: "Awaiting admin approval"
    };
    const saved = await updateChallenge(id, updatedForReEval);
    return NextResponse.json({ challenge: saved ?? updatedForReEval });
  }

  let patch: Partial<Challenge>;
  if (body.action === "approve") {
    patch = { adminContext: String(body.adminContext ?? "").trim(), reviewStatus: "APPROVED", status: "University approved to begin", approvedUniversityId: challenge.aiAssignedUniversityId, approvedUniversityName: challenge.aiAssignedUniversityName };
  } else {
    const universities = await listUniversities();
    const university = universities.find((item) => item.id === body.universityId && item.status === "APPROVED");
    if (!university) return NextResponse.json({ error: "Select an approved university." }, { status: 400 });
    patch = { adminContext: String(body.adminContext ?? "").trim(), reviewStatus: "REASSIGNED", status: "Reassigned by admin", approvedUniversityId: university.id, approvedUniversityName: university.name };
  }
  const saved = await updateChallenge(id, patch);
  return NextResponse.json({ challenge: saved });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  await initDb();
  const { id } = await context.params;
  const deleted = await deleteChallenge(id);
  if (!deleted) return NextResponse.json({ error: "Challenge not found." }, { status: 404 });
  return NextResponse.json({ deleted: id });
}
