import { redirect } from "next/navigation";
import AdminClient from "./admin-client";
import { requireAdmin } from "@/lib/auth";

export default async function AdminPage() {
  const session = await requireAdmin();
  if (!session) redirect("/login");
  return <AdminClient email={session.email} />;
}
