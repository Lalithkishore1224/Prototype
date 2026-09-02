import { NextResponse } from "next/server";
import { requireUniversity } from "@/lib/auth";
import { addNotification, getChallenge, initDb, updateChallenge } from "@/lib/db";
import type { Challenge } from "@/lib/workflow";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireUniversity();
  if (!session?.universityId || !session.universityName) return NextResponse.json({ error: "University sign in required." }, { status: 401 });
  await initDb();
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const githubUrl = String(body?.githubUrl || "").trim();
  if (!githubUrl) return NextResponse.json({ error: "A GitHub repository URL is required." }, { status: 400 });
  if (!/^https?:\/\/github\.com\/[^\s/]+\/[^\s/]+/.test(githubUrl)) return NextResponse.json({ error: "Provide a valid GitHub repository URL, e.g. https://github.com/org/repo" }, { status: 400 });

  const challenge = await getChallenge(id);
  if (!challenge) return NextResponse.json({ error: "Problem not found." }, { status: 404 });
  const assigned = (challenge.approvedUniversityId ?? challenge.aiAssignedUniversityId) === session.universityId;
  if (!assigned) return NextResponse.json({ error: "This problem is not assigned to your institution." }, { status: 403 });

  const now = new Date().toISOString();
  const patched: Challenge = {
    ...challenge,
    githubUrl,
    submittedAt: now,
    submissionStatus: "SUBMITTED",
    status: "Project submitted for review"
  };
  await updateChallenge(id, patched);

  await addNotification({
    id: `NTF-${Date.now()}`,
    type: "SUBMISSION",
    message: `${session.universityName} submitted the finished project for "${challenge.title}" and posted a GitHub repository.`,
    challengeId: challenge.id,
    universityId: session.universityId,
    universityName: session.universityName,
    githubUrl,
    createdAt: now,
    read: false
  });

  return NextResponse.json({ challenge: patched, notified: true });
}
