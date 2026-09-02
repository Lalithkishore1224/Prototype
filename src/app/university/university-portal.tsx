"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, CircleDot, ExternalLink, Github, Lightbulb, Loader2, LogOut, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type AssignedChallenge = {
  id: string; title: string; description: string; category: string; location: string;
  status: string; priority: string; confidence: number;
  solutionType: string; teamSize: number;
  githubUrl?: string; submittedAt?: string; submissionStatus?: "SUBMITTED" | "ACCEPTED" | "REJECTED";
};

function SubmitForm({ item, urls, notes, busy, onUrl, onNotes, onSubmit }: {
  item: AssignedChallenge;
  urls: Record<string, string>;
  notes: Record<string, string>;
  busy: boolean;
  onUrl: (id: string, value: string) => void;
  onNotes: (id: string, value: string) => void;
  onSubmit: (id: string) => void;
}) {
  return (
    <form className="review-actions" onSubmit={(event) => { event.preventDefault(); onSubmit(item.id); }}>
      <div style={{ display: "grid", gap: 10, width: "100%" }}>
        <label className="field">
          <span className="meta">GitHub repository URL of finished project</span>
          <input className="input" type="url" placeholder="https://github.com/org/repo" value={urls[item.id] ?? ""} onChange={(event) => onUrl(item.id, event.target.value)} required />
        </label>
        <label className="field">
          <span className="meta">Submission notes (optional)</span>
          <textarea className="textarea" rows={2} placeholder="Highlights, team members, or how the solution works..." value={notes[item.id] ?? ""} onChange={(event) => onNotes(item.id, event.target.value)} />
        </label>
      </div>
      <button className="primary" type="submit" disabled={busy}><Send size={15} /> Submit finished project</button>
    </form>
  );
}

export default function UniversityPortal({ universityId, universityName, email }: { universityId: string; universityName: string; email: string }) {
  const router = useRouter();
  const [challenges, setChallenges] = useState<AssignedChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const response = await fetch("/api/university/assigned");
    if (!response.ok) { router.push("/university/login"); return; }
    const data = await response.json();
    setChallenges(data.challenges);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="portal-shell"><main className="portal-content" style={{ minHeight: "40vh", display: "grid", placeItems: "center" }}><Loader2 size={28} /></main></div>;
  }

  async function submitProject(id: string) {
    const githubUrl = (urls[id] ?? "").trim();
    if (!githubUrl) { setError("Please provide the GitHub repository URL of your finished project."); return; }
    setBusy(true); setError(""); setNotice("");
    const response = await fetch(`/api/university/submit/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ githubUrl, notes: notes[id] ?? "" }) });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) { setError(data.error || "Unable to submit your project."); return; }
    setNotice("Project submitted. The admin has been notified and will review your GitHub repository.");
    setChallenges((items) => items.map((item) => (item.id === id ? data.challenge : item)));
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  const active = challenges.filter((item) => item.submissionStatus !== "ACCEPTED");
  const completed = challenges.filter((item) => item.submissionStatus === "ACCEPTED");

  return (
    <div className="portal-shell">
      <header className="nav">
        <Link href="/" className="brand"><span className="brand-mark"><Lightbulb size={17} /></span>JanNirmaan</Link>
        <div className="admin-user">
          <span className="session-email">{universityName}</span>
          <button className="ghost" onClick={logout}><LogOut size={15} /> Sign out</button>
        </div>
      </header>
      <main className="portal-content">
        <Link href="/" className="back-link"><ArrowLeft size={15} /> Public board</Link>
        <div className="portal-hero">
          <div>
            <div className="eyebrow">University solution portal</div>
            <h1>Your assigned challenges</h1>
            <p className="muted">Build the solution, then submit the GitHub repository of your finished project. The platform admin is notified automatically.</p>
          </div>
          <div className="portal-icon"><Github size={30} /></div>
        </div>
        {notice && <div className="success-note" style={{ marginBottom: 16 }}><CheckCircle2 size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />{notice}</div>}
        {error && <div className="error-note" style={{ marginBottom: 16 }}>{error}</div>}
        <div className="portal-stack">
          <section className="card">
            <div className="section-head" style={{ marginBottom: 12 }}>
              <div>
                <h2>In progress</h2>
                <p className="muted">{active.length} challenge{active.length === 1 ? "" : "s"} assigned to {universityName}.</p>
              </div>
              <span className="badge green"><CircleDot size={13} /> {email}</span>
            </div>
            {active.length === 0 ? <div className="empty-state">No in-progress assignments right now.</div> : (
              <div className="review-list">
                {active.map((item) => (
                  <article className="review-item" key={item.id}>
                    <div className="review-copy">
                      <span className="meta">{item.id} · {item.category} · {item.location} · {item.solutionType} · ~{item.teamSize} students</span>
                      <h3>{item.title}</h3>
                      <p className="muted">{item.description}</p>
                      <span className={`badge ${item.submissionStatus === "SUBMITTED" ? "green" : "orange"}`}>
                        {item.submissionStatus === "SUBMITTED" ? "Submitted · awaiting review" : item.submissionStatus === "REJECTED" ? "Returned for revision" : item.status}
                      </span>
                    </div>
                    {item.submissionStatus === "SUBMITTED" ? (
                      <div className="review-actions">
                        <span className="meta"><ExternalLink size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />GitHub: <a href={item.githubUrl} target="_blank" rel="noreferrer" style={{ color: "#7dd3fc" }}>{item.githubUrl}</a></span>
                      </div>
                    ) : (
                      <SubmitForm item={item} urls={urls} notes={notes} busy={busy}
                        onUrl={(id, value) => setUrls((current) => ({ ...current, [id]: value }))}
                        onNotes={(id, value) => setNotes((current) => ({ ...current, [id]: value }))}
                        onSubmit={submitProject} />
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
        {completed.length > 0 && (
          <div className="card" style={{ marginTop: 20 }}>
            <div className="badge green">Accepted</div>
            <h2>Accepted projects</h2>
            <div className="directory-list">
              {completed.map((item) => (
                <div className="directory-item" key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.id} · submitted {new Date(item.submittedAt ?? "").toLocaleDateString()}</span>
                    <small>GitHub: <a href={item.githubUrl} target="_blank" rel="noreferrer" style={{ color: "#7dd3fc" }}>{item.githubUrl}</a></small>
                  </div>
                  <div className="directory-actions"><span className="badge green">ACCEPTED</span></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
