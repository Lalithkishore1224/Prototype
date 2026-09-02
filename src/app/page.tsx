"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, CheckCircle2, CircleDot, Lightbulb, LogIn, Sparkles, X, University, BriefcaseBusiness } from "lucide-react";
import Link from "next/link";

type Challenge = { id: string; title: string; description: string; category: string; location: string; status: string; priority: string; confidence: number; submittedBy: string };

const initialChallenges: Challenge[] = [
  { id: "CH-1042", title: "Flood-safe access routes for low-lying wards", description: "Residents need reliable route information and early closure alerts during monsoon flooding.", category: "Disaster resilience", location: "Ranchi, Jharkhand", status: "Seeking teams", priority: "High", confidence: 94, submittedBy: "Asha Devi" },
  { id: "CH-1038", title: "Reduce wait time at rural health centres", description: "A lightweight queue and appointment visibility system for patients with limited connectivity.", category: "Public health", location: "Khunti, Jharkhand", status: "In discovery", priority: "Medium", confidence: 89, submittedBy: "District health office" },
  { id: "CH-1031", title: "Market access for women-led micro-enterprises", description: "Connect local producers with institutional buyers while making quality and pricing transparent.", category: "Livelihoods", location: "Dumka, Jharkhand", status: "University matched", priority: "Medium", confidence: 91, submittedBy: "Sakhi collective" }
];

export default function HomePage() {
  const [challenges, setChallenges] = useState(initialChallenges);
  const [search, setSearch] = useState("");
  const [showSubmit, setShowSubmit] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [notice, setNotice] = useState("");
  const [session, setSession] = useState<{ email: string; role: string } | null>(null);
  const [stats, setStats] = useState<{ challenges: number; universities: number; mentors: number; pilot: number } | null>(null);
  useEffect(() => { fetch("/api/challenges").then((response) => response.json()).then((data) => setChallenges(data.challenges)).catch(() => undefined); }, []);
  useEffect(() => { fetch("/api/stats").then((response) => response.json()).then((data) => setStats(data.stats)).catch(() => undefined); }, []);
  useEffect(() => { fetch("/api/me").then((response) => response.json()).then((data) => setSession(data.user)).catch(() => undefined); }, []);
  const filtered = challenges.filter((item) => `${item.title} ${item.description} ${item.category}`.toLowerCase().includes(search.toLowerCase()));
  const fmt = (n: number) => String(n).padStart(2, "0");
  const shownStats = stats ?? { challenges: challenges.length, universities: 0, mentors: 0, pilot: 0 };

  async function addChallenge(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const submittedBy = String(form.get("submittedBy") || "").trim();
    const title = String(form.get("title") || "").trim();
    const description = String(form.get("description") || "").trim();
    const location = String(form.get("location") || "").trim();
    if (!submittedBy || !title || description.length < 30 || !location) return;
    const category = String(form.get("category") || "Community");
    const response = await fetch("/api/challenges", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ submittedBy, title, description, category, location }) });
    if (!response.ok) return;
    const result = await response.json();
    const next: Challenge = { id: result.challenge.id, title, description, category, location, status: result.challenge.status, priority: result.challenge.priority, confidence: result.challenge.confidence, submittedBy };
    setChallenges((items) => [next, ...items]);
    setShowSubmit(false);
    setNotice(`Challenge submitted. AI recommended ${result.challenge.aiAssignedUniversityName}; it is waiting for admin approval before university action.`);
  }

  return <div className="shell">
    <header className="nav"><div className="brand"><span className="brand-mark"><Lightbulb size={17} /></span>JanNirmaan</div><nav className="nav-links"><button className="nav-link" onClick={() => document.getElementById("challenges")?.scrollIntoView({ behavior: "smooth" })}>Explore challenges</button><Link className="nav-link" href="/university"><University size={14} /> University</Link><Link className="nav-link" href="/stakeholder"><BriefcaseBusiness size={14} /> Stakeholder</Link>{session?.role === "ADMIN" ? <><span className="session-email">{session.email}</span><Link className="outline" href="/admin">Admin dashboard</Link></> : <Link className="outline" href="/login"><LogIn size={15} /> Admin sign in</Link>}</nav></header>
    <main>
      <section className="hero"><div><div className="eyebrow">SIH26043 · Jharkhand</div><h1>Turn a local challenge into a shared solution.</h1><p>JanNirmaan connects citizen voices to universities, mentors, industry partners, and government teams so good ideas can move from report to reality.</p><div className="hero-actions"><button className="primary" onClick={() => setShowSubmit(true)}>Report a challenge <ArrowUpRight size={16} /></button><button className="ghost" onClick={() => document.getElementById("challenges")?.scrollIntoView({ behavior: "smooth" })}>View active work</button></div></div><div className="signal-card"><div className="signal-top"><span>LIVE PLATFORM SIGNAL</span><span><CircleDot size={13} color="#7dd3fc" /> 24 active teams</span></div><h3>From voice to action</h3><p>Every submission gets a transparent route: AI triage, expert validation, university matching, and measurable progress.</p><div className="meta" style={{ color: "#b7c4d8" }}>CHALLENGE INTAKE</div><div className="signal-line"><span style={{ width: "92%" }} /></div><div className="meta" style={{ color: "#b7c4d8" }}>UNIVERSITY MATCHING</div><div className="signal-line"><span style={{ width: "68%" }} /></div><div className="meta" style={{ color: "#b7c4d8" }}>PILOT READINESS</div><div className="signal-line"><span style={{ width: "41%" }} /></div></div></section>
      <section className="stats"><div className="stat"><small>Challenges received</small><strong>{fmt(shownStats.challenges)}</strong></div><div className="stat"><small>University teams</small><strong>{fmt(shownStats.universities)}</strong></div><div className="stat"><small>Industry mentors</small><strong>{fmt(shownStats.mentors)}</strong></div><div className="stat"><small>Projects in pilot</small><strong>{fmt(shownStats.pilot)}</strong></div></section>
      <section className="content" id="challenges"><div className="section-head"><div><h2>Community challenge board</h2><p>Problems are public, traceable, and ready for the right team.</p></div><button className="primary" onClick={() => setShowSubmit(true)}>Report problem</button></div><div className="filters"><input className="input" placeholder="Search challenges..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>{notice && <div className="success-note" style={{ marginBottom: 16 }}><CheckCircle2 size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />{notice}</div>}<div className="challenge-grid">{filtered.map((item) => <article className="card challenge" key={item.id}><div><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span className={`badge ${item.priority === "High" ? "orange" : ""}`}>{item.priority} priority</span><span className="meta">{item.id}</span></div><h3>{item.title}</h3><p>{item.description}</p></div><div className="challenge-footer"><div><div className="meta">{item.category} · {item.location}</div></div><span className="badge green">{item.status}</span></div></article>)}</div></section>
    </main>
    {showSubmit && <div className="modal-backdrop"><div className="modal"><div className="modal-head"><div><div className="eyebrow">Citizen intake</div><h2 style={{ marginTop: 6 }}>Report a challenge</h2><p className="muted">You do not need to know the technical solution. Describe the problem and JanNirmaan will infer the solution path and team size.</p></div><button className="close" onClick={() => setShowSubmit(false)}><X size={16} /></button></div><form className="form-grid" onSubmit={addChallenge}><div className="field"><label htmlFor="submittedBy">Your name</label><input className="input" id="submittedBy" name="submittedBy" placeholder="e.g. Asha Devi" required /></div><div className="field"><label htmlFor="title">Challenge title</label><input className="input" id="title" name="title" placeholder="What needs to change?" required /></div><div className="field"><label htmlFor="description">What is happening?</label><textarea className="textarea" id="description" name="description" placeholder="Include who is affected, where it happens, and why it matters (minimum 30 characters)." required minLength={30} /></div><div className="config-row"><div className="field"><label htmlFor="category">Category</label><select className="select" id="category" name="category" defaultValue="Disaster resilience"><option>Disaster resilience</option><option>Public health</option><option>Education</option><option>Livelihoods</option><option>Environment</option></select></div><div className="field"><label htmlFor="location">Location</label><input className="input" id="location" name="location" placeholder="District, state" required /></div></div><div className="form-actions"><button type="button" className="outline" onClick={() => setShowSubmit(false)}>Cancel</button><button type="submit" className="primary">Submit for AI review <Sparkles size={15} /></button></div></form></div></div>}
  </div>;
}
