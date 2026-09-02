import { NextResponse } from "next/server";
import { buildChallenge } from "@/lib/workflow";
import { evaluateChallenge } from "@/lib/ai";
import { addChallenge, listChallenges, listUniversities, initDb } from "@/lib/db";

export async function GET() {
  await initDb();
  const challenges = await listChallenges();
  return NextResponse.json({ challenges });
}

export async function POST(request: Request) {
  await initDb();
  const body = await request.json().catch(() => null);
  const submittedBy = typeof body?.submittedBy === "string" ? String(body.submittedBy).trim() : "";
  if (!body?.title || !body?.description || String(body.description).trim().length < 30 || !body?.location || !submittedBy) {
    return NextResponse.json({ error: "Your name, the challenge title, location, and a 30-character description are required." }, { status: 400 });
  }
  const input = { title: String(body.title).trim(), description: String(body.description).trim(), category: String(body.category ?? "Community"), location: String(body.location).trim(), submittedBy };
  let evaluation;
  try {
    const universities = await listUniversities();
    evaluation = await evaluateChallenge(input, universities);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The challenge evaluator could not complete." }, { status: 503 });
  }
  const challenge = buildChallenge({ ...input, solutionType: evaluation.solutionType, teamSize: evaluation.teamSize, universityId: evaluation.university.id, universityName: evaluation.university.name, confidence: evaluation.confidence, rationale: evaluation.rationale });
  await addChallenge(challenge);
  return NextResponse.json({ challenge, evaluation: { category: challenge.category, priority: challenge.priority.toUpperCase(), confidence: challenge.confidence / 100, duplicateCandidates: [], routedTo: challenge.aiAssignedUniversityName, rationale: challenge.aiRationale, engine: evaluation.engine, requiresAdminApproval: true } }, { status: 201 });
}
