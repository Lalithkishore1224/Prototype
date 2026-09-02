export type ReviewStatus = "PENDING_ADMIN_APPROVAL" | "APPROVED" | "REASSIGNED";
export type University = { id: string; name: string; city: string; focus: string; description: string; email: string; teamCapacity: number; solutionTypes: "SOFTWARE" | "HARDWARE" | "BOTH"; status: "PENDING" | "APPROVED" | "REJECTED"; };
export type Stakeholder = { id: string; organization: string; contact: string; type: string; status: "PENDING" | "APPROVED" | "REJECTED"; };
export type Challenge = {
  id: string; title: string; description: string; category: string; location: string;
  status: string; priority: string; confidence: number; submittedBy: string;
  solutionType: "SOFTWARE" | "HARDWARE"; teamSize: number; adminContext?: string; aiRationale?: string;
  aiAssignedUniversityId: string; aiAssignedUniversityName: string; reviewStatus: ReviewStatus;
  approvedUniversityId?: string; approvedUniversityName?: string; createdAt: string;
};

export function buildChallenge(input: { title: string; description: string; category: string; location: string; solutionType: "SOFTWARE" | "HARDWARE"; teamSize: number; submittedBy?: string; universityId: string; universityName: string; confidence: number; rationale: string; }): Challenge {
  const university = { id: input.universityId, name: input.universityName };
  const challenge: Challenge = { id: `CH-${Date.now().toString().slice(-6)}`, title: input.title, description: input.description, category: input.category, location: input.location, status: "Awaiting admin approval", priority: input.category === "Disaster resilience" ? "High" : "Medium", confidence: input.confidence, submittedBy: input.submittedBy ?? "Citizen reporter", solutionType: input.solutionType, teamSize: input.teamSize, aiAssignedUniversityId: university.id, aiAssignedUniversityName: university.name, aiRationale: input.rationale, reviewStatus: "PENDING_ADMIN_APPROVAL", createdAt: new Date().toISOString() };
  return challenge;
}
