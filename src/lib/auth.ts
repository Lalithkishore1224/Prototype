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

export async function getSession() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return { email: String(payload.email), role: payload.role === "ADMIN" ? "ADMIN" as const : "CITIZEN" as const };
  } catch {
    return null;
  }
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return null;
  return session;
}

export { COOKIE_NAME };
