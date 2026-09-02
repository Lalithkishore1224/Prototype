import { NextResponse } from "next/server";
import { createSession, DEMO_ADMIN } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  if (!email || !password) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });

  const isAdmin = email === DEMO_ADMIN.email.toLowerCase() && password === DEMO_ADMIN.password;
  if (!isAdmin) return NextResponse.json({ error: "Invalid credentials. Use the demo admin account provided below." }, { status: 401 });

  await createSession(email, "ADMIN");
  return NextResponse.json({ user: { email, role: "ADMIN" } });
}
