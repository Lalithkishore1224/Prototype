import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getNotifications, initDb, markNotificationsRead } from "@/lib/db";

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  await initDb();
  const notifications = await getNotifications();
  const unread = notifications.filter((item) => !item.read).length;
  return NextResponse.json({ notifications, unread });
}

export async function POST() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  await initDb();
  await markNotificationsRead();
  const notifications = await getNotifications();
  return NextResponse.json({ notifications, unread: 0 });
}
