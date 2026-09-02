import { Pool, type PoolClient } from "pg";
import type { Challenge, Stakeholder, University } from "./workflow";
import type { AiConfig } from "./ai";

const globalPool = globalThis as typeof globalThis & { jannirmaanPool?: Pool };

function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured.");
  return url;
}

export function getPool(): Pool {
  if (!globalPool.jannirmaanPool) {
    globalPool.jannirmaanPool = new Pool({
      connectionString: databaseUrl(),
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 20000,
      connectionTimeoutMillis: 20000
    });
  }
  return globalPool.jannirmaanPool;
}

export async function query<T extends Record<string, unknown> = Record<string, unknown>>(text: string, params?: unknown[]) {
  const pool = getPool();
  const result = await pool.query(text, params);
  return result.rows as T[];
}

export async function withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS jannirmaan_universities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  focus TEXT NOT NULL,
  description TEXT NOT NULL,
  email TEXT NOT NULL,
  team_capacity INTEGER NOT NULL,
  solution_types TEXT NOT NULL,
  status TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS jannirmaan_stakeholders (
  id TEXT PRIMARY KEY,
  organization TEXT NOT NULL,
  contact TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS jannirmaan_challenges (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  location TEXT NOT NULL,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  confidence INTEGER NOT NULL,
  submitted_by TEXT NOT NULL,
  solution_type TEXT,
  team_size INTEGER,
  admin_context TEXT,
  ai_rationale TEXT,
  ai_assigned_university_id TEXT,
  ai_assigned_university_name TEXT,
  review_status TEXT NOT NULL,
  approved_university_id TEXT,
  approved_university_name TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS jannirmaan_ai_config (
  id INTEGER PRIMARY KEY,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  base_url TEXT NOT NULL DEFAULT '',
  api_key TEXT,
  configured BOOLEAN NOT NULL,
  updated_at TEXT NOT NULL
);
`;

const SEED_UNIVERSITIES: University[] = [
  { id: "uni-1", name: "BIT Mesra · Centre for Smart Systems", city: "Ranchi", focus: "IoT, disaster resilience, civic systems", description: "A campus innovation centre with student teams for civic technology and field pilots.", email: "partnerships@bitmesra.ac.in", teamCapacity: 40, solutionTypes: "BOTH", status: "APPROVED" },
  { id: "uni-2", name: "National Institute of Technology Jamshedpur", city: "Jamshedpur", focus: "Public systems, software engineering", description: "Software engineering and public systems teams building scalable digital services.", email: "innovation@nitjsr.ac.in", teamCapacity: 30, solutionTypes: "SOFTWARE", status: "APPROVED" },
  { id: "uni-3", name: "Central University of Jharkhand", city: "Ranchi", focus: "Livelihoods, social innovation", description: "Interdisciplinary student groups focused on livelihood, community, and social innovation.", email: "innovation@cuj.ac.in", teamCapacity: 24, solutionTypes: "BOTH", status: "APPROVED" }
];

const SEED_CHALLENGES: Challenge[] = [
  { id: "CH-1042", title: "Flood-safe access routes for low-lying wards", description: "Residents need reliable route information and early closure alerts during monsoon flooding.", category: "Disaster resilience", location: "Ranchi, Jharkhand", status: "Awaiting admin approval", priority: "High", confidence: 94, submittedBy: "Asha Devi", solutionType: "SOFTWARE", teamSize: 8, aiAssignedUniversityId: "uni-1", aiAssignedUniversityName: "BIT Mesra · Centre for Smart Systems", aiRationale: "Matched by software capability, disaster systems focus, and capacity for 8 student contributors.", reviewStatus: "PENDING_ADMIN_APPROVAL", createdAt: new Date().toISOString() },
  { id: "CH-1038", title: "Reduce wait time at rural health centres", description: "A lightweight queue and appointment visibility system for patients with limited connectivity.", category: "Public health", location: "Khunti, Jharkhand", status: "University matched", priority: "Medium", confidence: 89, submittedBy: "District health office", solutionType: "SOFTWARE", teamSize: 5, aiAssignedUniversityId: "uni-2", aiAssignedUniversityName: "National Institute of Technology Jamshedpur", reviewStatus: "APPROVED", approvedUniversityId: "uni-2", approvedUniversityName: "National Institute of Technology Jamshedpur", createdAt: new Date().toISOString() },
  { id: "CH-1031", title: "Market access for women-led micro-enterprises", description: "Connect local producers with institutional buyers while making quality and pricing transparent.", category: "Livelihoods", location: "Dumka, Jharkhand", status: "AI recommendation ready", priority: "Medium", confidence: 91, submittedBy: "Sakhi collective", solutionType: "BOTH" as "SOFTWARE", teamSize: 6, aiAssignedUniversityId: "uni-3", aiAssignedUniversityName: "Central University of Jharkhand", aiRationale: "Matched by social innovation focus and capacity for 6 student contributors.", reviewStatus: "PENDING_ADMIN_APPROVAL", createdAt: new Date().toISOString() }
];

async function ensureSchema(client: PoolClient) {
  await client.query(SCHEMA);
}

let initPromise: Promise<void> | null = null;

export function initDb(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    return Promise.resolve();
  }
  if (!initPromise) {
    initPromise = withClient(async (client) => {
      await ensureSchema(client);
      const count = await client.query("SELECT COUNT(*)::int AS count FROM jannirmaan_universities");
      if (count.rows[0].count === 0) {
        await seed(client);
      }
    }).catch((error) => {
      initPromise = null;
      throw error;
    });
  }
  return initPromise;
}

async function seed(client: PoolClient) {
  for (const u of SEED_UNIVERSITIES) {
    await client.query(
      `INSERT INTO jannirmaan_universities (id, name, city, focus, description, email, team_capacity, solution_types, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
      [u.id, u.name, u.city, u.focus, u.description, u.email, u.teamCapacity, u.solutionTypes, u.status]
    );
  }
  for (const c of SEED_CHALLENGES) {
    await insertChallenge(client, c);
  }
}

const CHALLENGE_COLUMNS = `id, title, description, category, location, status, priority, confidence,
  submitted_by, solution_type, team_size, admin_context, ai_rationale,
  ai_assigned_university_id, ai_assigned_university_name, review_status,
  approved_university_id, approved_university_name, created_at`;

function challengeFromRow(row: Record<string, unknown>): Challenge {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    category: row.category as string,
    location: row.location as string,
    status: row.status as string,
    priority: row.priority as string,
    confidence: row.confidence as number,
    submittedBy: row.submitted_by as string,
    solutionType: (row.solution_type as "SOFTWARE" | "HARDWARE" | undefined) ?? "SOFTWARE",
    teamSize: (row.team_size as number | null) ?? 0,
    adminContext: (row.admin_context as string | null) ?? undefined,
    aiRationale: (row.ai_rationale as string | null) ?? undefined,
    aiAssignedUniversityId: (row.ai_assigned_university_id as string | null) ?? "",
    aiAssignedUniversityName: (row.ai_assigned_university_name as string | null) ?? "",
    reviewStatus: row.review_status as Challenge["reviewStatus"],
    approvedUniversityId: (row.approved_university_id as string | null) ?? undefined,
    approvedUniversityName: (row.approved_university_name as string | null) ?? undefined,
    createdAt: row.created_at as string
  };
}

function universityFromRow(row: Record<string, unknown>): University {
  return {
    id: row.id as string,
    name: row.name as string,
    city: row.city as string,
    focus: row.focus as string,
    description: row.description as string,
    email: row.email as string,
    teamCapacity: row.team_capacity as number,
    solutionTypes: row.solution_types as University["solutionTypes"],
    status: row.status as University["status"]
  };
}

function stakeholderFromRow(row: Record<string, unknown>): Stakeholder {
  return {
    id: row.id as string,
    organization: row.organization as string,
    contact: row.contact as string,
    type: row.type as string,
    status: row.status as Stakeholder["status"]
  };
}

async function insertChallenge(client: PoolClient, c: Challenge) {
  await client.query(
    `INSERT INTO jannirmaan_challenges (${CHALLENGE_COLUMNS}) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
     ON CONFLICT (id) DO NOTHING`,
    [c.id, c.title, c.description, c.category, c.location, c.status, c.priority, c.confidence, c.submittedBy,
     c.solutionType, c.teamSize, c.adminContext ?? null, c.aiRationale ?? null,
     c.aiAssignedUniversityId, c.aiAssignedUniversityName, c.reviewStatus,
     c.approvedUniversityId ?? null, c.approvedUniversityName ?? null, c.createdAt]
  );
}

export async function listChallenges(client?: PoolClient): Promise<Challenge[]> {
  if (client) {
    const rows = await client.query(`SELECT ${CHALLENGE_COLUMNS} FROM jannirmaan_challenges ORDER BY created_at DESC, id DESC`);
    return rows.rows.map(challengeFromRow);
  }
  const rows = await query(`SELECT ${CHALLENGE_COLUMNS} FROM jannirmaan_challenges ORDER BY created_at DESC, id DESC`);
  return rows.map(challengeFromRow);
}

export async function listUniversities(): Promise<University[]> {
  const rows = await query(`SELECT id, name, city, focus, description, email, team_capacity, solution_types, status FROM jannirmaan_universities ORDER BY id`);
  return rows.map(universityFromRow);
}

export async function listStakeholders(): Promise<Stakeholder[]> {
  const rows = await query(`SELECT id, organization, contact, type, status FROM jannirmaan_stakeholders ORDER BY id`);
  return rows.map(stakeholderFromRow);
}

export async function addChallenge(c: Challenge): Promise<void> {
  await withClient(async (client) => {
    await insertChallenge(client, c);
  });
}

export async function updateChallenge(id: string, patch: Partial<Challenge>): Promise<Challenge | null> {
  let updated: Challenge | null = null;
  await withClient(async (client) => {
    const existing = await client.query(`SELECT ${CHALLENGE_COLUMNS} FROM jannirmaan_challenges WHERE id = $1`, [id]);
    if (existing.rowCount === 0) return;
    const current = challengeFromRow(existing.rows[0]);
    const merged: Challenge = { ...current, ...patch };
    await client.query(
      `UPDATE jannirmaan_challenges SET title=$2, description=$3, category=$4, location=$5, status=$6, priority=$7, confidence=$8, submitted_by=$9, solution_type=$10, team_size=$11, admin_context=$12, ai_rationale=$13, ai_assigned_university_id=$14, ai_assigned_university_name=$15, review_status=$16, approved_university_id=$17, approved_university_name=$18 WHERE id=$1`,
      [id, merged.title, merged.description, merged.category, merged.location, merged.status, merged.priority, merged.confidence, merged.submittedBy, merged.solutionType, merged.teamSize, merged.adminContext ?? null, merged.aiRationale ?? null, merged.aiAssignedUniversityId, merged.aiAssignedUniversityName, merged.reviewStatus, merged.approvedUniversityId ?? null, merged.approvedUniversityName ?? null]
    );
    updated = merged;
  });
  return updated;
}

export async function deleteChallenge(id: string): Promise<boolean> {
  const result = await getPool().query("DELETE FROM jannirmaan_challenges WHERE id = $1", [id]);
  return result.rowCount !== 0;
}

export async function addUniversity(u: University): Promise<void> {
  await getPool().query(
    `INSERT INTO jannirmaan_universities (id, name, city, focus, description, email, team_capacity, solution_types, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [u.id, u.name, u.city, u.focus, u.description, u.email, u.teamCapacity, u.solutionTypes, u.status]
  );
}

export async function addStakeholder(s: Stakeholder): Promise<void> {
  await getPool().query(
    `INSERT INTO jannirmaan_stakeholders (id, organization, contact, type, status) VALUES ($1,$2,$3,$4,$5)`,
    [s.id, s.organization, s.contact, s.type, s.status]
  );
}

export async function setOrganizationStatus(id: string, status: "APPROVED" | "REJECTED"): Promise<"university" | "stakeholder" | null> {
  const u = await getPool().query("UPDATE jannirmaan_universities SET status = $2 WHERE id = $1", [id, status]);
  if (u.rowCount !== 0) return "university";
  const s = await getPool().query("UPDATE jannirmaan_stakeholders SET status = $2 WHERE id = $1", [id, status]);
  if (s.rowCount !== 0) return "stakeholder";
  return null;
}

export async function getAiConfigRow(): Promise<AiConfig | null> {
  const rows = await query(`SELECT provider, model, base_url, api_key, configured, updated_at FROM jannirmaan_ai_config WHERE id = 1`);
  if (rows.length === 0) return null;
  return {
    provider: rows[0].provider as string,
    model: rows[0].model as string,
    baseUrl: rows[0].base_url as string,
    apiKey: (rows[0].api_key as string | null) ?? undefined,
    configured: rows[0].configured as boolean,
    updatedAt: rows[0].updated_at as string
  };
}

export async function setAiConfigRow(config: AiConfig): Promise<void> {
  await getPool().query(
    `INSERT INTO jannirmaan_ai_config (id, provider, model, base_url, api_key, configured, updated_at)
     VALUES (1, $1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO UPDATE SET provider=$1, model=$2, base_url=$3, api_key=$4, configured=$5, updated_at=$6`,
    [config.provider, config.model, config.baseUrl, config.apiKey ?? null, config.configured, config.updatedAt]
  );
}
