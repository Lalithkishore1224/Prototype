import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAiConfig, setAiConfig, testAiConnection } from "@/lib/ai";
import { initDb } from "@/lib/db";

async function serialize() {
  const config = await getAiConfig();
  return { provider: config.provider, model: config.model, baseUrl: config.baseUrl, configured: config.configured, updatedAt: config.updatedAt, apiKeyMasked: config.apiKey ? `${config.apiKey.slice(0, 4)}****${config.apiKey.slice(-4)}` : null };
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  await initDb();
  return NextResponse.json(await serialize());
}

export async function PUT(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  await initDb();
  const body = await request.json().catch(() => null);
  if (!body?.provider || !body?.model) return NextResponse.json({ error: "Provider and model are required." }, { status: 400 });
  await setAiConfig({ provider: String(body.provider), model: String(body.model), baseUrl: String(body.baseUrl ?? ""), apiKey: String(body.apiKey ?? "") });
  return NextResponse.json(await serialize());
}

export async function POST() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  await initDb();
  try { return NextResponse.json(await testAiConnection()); } catch { return NextResponse.json({ ok: false, configured: true, message: "The evaluator provider could not be reached. Check the server network and configuration." }, { status: 502 }); }
}
