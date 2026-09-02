"use client";

import { useState } from "react";
import { ArrowLeft, KeyRound, Lightbulb, Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@jannirmaan.local");
  const [password, setPassword] = useState("Admin@12345");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true); setError("");
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Unable to sign in"); setLoading(false); return; }
    router.push("/admin"); router.refresh();
  }

  return <main className="auth-page"><div className="auth-card"><Link href="/" className="back-link"><ArrowLeft size={15} /> Back to JanNirmaan</Link><div className="auth-brand"><span className="brand-mark"><Lightbulb size={17} /></span><span>JanNirmaan</span></div><div className="eyebrow">Platform operations</div><h1>Admin sign in</h1><p className="muted">Use the platform administrator account to manage the AI evaluator and operational settings.</p><form className="form-grid" onSubmit={submit}><div className="field"><label htmlFor="email">Email address</label><input className="input" id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div><div className="field"><label htmlFor="password">Password</label><input className="input" id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div>{error && <p className="error-note">{error}</p>}<button className="primary" disabled={loading}>{loading ? <Loader2 size={16} /> : <ShieldCheck size={16} />} Sign in securely</button></form><div className="demo-note"><KeyRound size={16} /><div><strong>Demo account</strong><span>Credentials are prefilled for this local prototype.</span></div></div></div></main>;
}
