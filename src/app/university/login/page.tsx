"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Building2, Lightbulb, Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type University = { id: string; name: string; city: string; focus: string; email: string };

export default function UniversityLoginPage() {
  const router = useRouter();
  const [universities, setUniversities] = useState<University[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/universities").then((response) => response.json()).then((data) => {
      setUniversities((data.universities || []).filter((u: University) => data.universities && u));
    }).finally(() => setLoaded(true));
  }, []);

  async function signIn(id: string) {
    setBusy(true); setError("");
    const response = await fetch("/api/auth/university/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ universityId: id }) });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) { setError(data.error || "Unable to sign in to that institution."); return; }
    router.push("/university"); router.refresh();
  }

  return <main className="auth-page"><div className="auth-card"><Link href="/" className="back-link"><ArrowLeft size={15} /> Back to JanNirmaan</Link><div className="auth-brand"><span className="brand-mark"><Building2 size={17} /></span><span>JanNirmaan · University</span></div><div className="eyebrow">Institution workspace</div><h1>Sign in to your solution portal</h1><p className="muted">Choose your institution to view the problems assigned to your student teams and submit finished projects with a GitHub repository.</p>{error && <p className="error-note">{error}</p>}{!loaded ? <div style={{ textAlign: "center", padding: "24px 0" }}><Loader2 size={24} /></div> : universities.length === 0 ? <div className="empty-state">No approved institutions are available yet. Contact the platform admin.</div> : <div className="directory-list" style={{ marginTop: 8 }}>{universities.map((u) => <div className="directory-item" key={u.id}><div><strong>{u.name}</strong><span>{u.city}</span><small>{u.focus}</small><small>{u.email}</small></div><div className="directory-actions"><button className="primary small-button" disabled={busy} onClick={() => signIn(u.id)}><ShieldCheck size={14} /> Sign in</button></div></div>)}</div>}</div></main>;
}
