import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SignJWT } from "jose";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("jannirmaan_oauth_state")?.value;
  if (!url.searchParams.get("code") || !expectedState || expectedState !== url.searchParams.get("state")) {
    return NextResponse.redirect(`${origin}/?auth=invalid_state`);
  }
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return NextResponse.redirect(`${origin}/?auth=google_not_configured`);
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code: url.searchParams.get("code")!, client_id: clientId, client_secret: clientSecret, redirect_uri: `${origin}/api/auth/google/callback`, grant_type: "authorization_code" }) });
  if (!tokenResponse.ok) return NextResponse.redirect(`${origin}/?auth=google_failed`);
  const token = await tokenResponse.json();
  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${token.access_token}` } });
  if (!profileResponse.ok) return NextResponse.redirect(`${origin}/?auth=google_failed`);
  const profile = await profileResponse.json();
  const secret = new TextEncoder().encode(process.env.SESSION_SECRET || "development-only-change-me");
  const session = await new SignJWT({ email: profile.email, name: profile.name, picture: profile.picture }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(secret);
  const response = NextResponse.redirect(`${origin}/?auth=success`);
  response.cookies.set("jannirmaan_session", session, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 });
  response.cookies.delete("jannirmaan_oauth_state");
  return response;
}
