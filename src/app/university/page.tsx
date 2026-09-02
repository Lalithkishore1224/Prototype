import { redirect } from "next/navigation";
import { requireUniversity } from "@/lib/auth";
import UniversityPortal from "./university-portal";

export default async function UniversityPage() {
  const session = await requireUniversity();
  if (!session || !session.universityId) redirect("/university/login");
  return <UniversityPortal universityId={session.universityId} universityName={session.universityName ?? ""} email={session.email} />;
}
