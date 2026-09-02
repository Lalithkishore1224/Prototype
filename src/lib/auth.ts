import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";

const COOKIE_NAME = "jannirmaan_session";
const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET || "jannirmaan-demo-secret-change-me");

export const DEMO_ADMIN = {
  email: process.env.ADMIN_EMAIL || "admin@jannirmaan.local",
  password: process.env.ADMIN_PASSWORD || "Admin@12345"
};

export async function createSession(email: string, role: "ADMIN" | "CITIZEN") {
  const token = await new SignJWT({ email, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret());
  const store = await cookies();
  store.set(COOKIE_NAME, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 8 * 60 * 60 });
}

export async function createUniversitySession(university: { id: string; name: string; email: string }) {
  const token = await new SignJWT({ email: university.email, role: "UNIVERSITY", universityId: university.id, universityName: university.name })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret());
  const store = await cookies();
  store.set(COOKIE_NAME, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 8 * 60 * 60 });
}

export type Session = { email: string; role: "ADMIN" | "CITIZEN" | "UNIVERSITY"; universityId?: string; universityName?: string };

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const role = payload.role === "ADMIN" ? "ADMIN" as const : payload.role === "UNIVERSITY" ? "UNIVERSITY" as const : "CITIZEN" as const;
    return {
      email: String(payload.email),
      role,
      universityId: payload.universityId ? String(payload.universityId) : undefined,
      universityName: payload.universityName ? String(payload.universityName) : undefined
    };
  } catch {
    return null;
  }
}

export async function requireAdmin(): Promise<Session | null> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return null;
  return session;
}

export async function requireUniversity(): Promise<Session | null> {
  const session = await getSession();
  if (!session || session.role !== "UNIVERSITY" || !session.universityId) return null;
  return session;
}

export { COOKIE_NAME };
