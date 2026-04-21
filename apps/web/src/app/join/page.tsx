"use client";

import { Suspense } from "react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { API_BASE_URL, parseJson } from "../lib/api";

function JoinPageInner() {
  const params = useSearchParams();
  const initialToken = useMemo(() => params.get("token") ?? "", [params]);
  const [token, setToken] = useState(initialToken);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState<string>("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE_URL}/invites/validate?token=${encodeURIComponent(token)}`)
      .then((r) => parseJson<{ valid: boolean; reason: string | null }>(r))
      .then((d) => {
        setStatus(d.valid ? "valid" : `invalid:${d.reason}`);
      })
      .catch(() => setStatus("invalid"));
  }, [token]);

  async function onJoin(event: FormEvent) {
    event.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/invites/join`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token,
          email,
          password,
          displayName: displayName || undefined
        })
      });
      const data = await parseJson<{ token: string }>(res);
      localStorage.setItem("studentToken", data.token);
      setMessage("Готово: student создан и привязан к группе.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "join_failed");
    }
  }

  return (
    <main>
      <section className="card stack">
        <h1 className="title">Join by Invite</h1>
        <p className="muted">Студент регистрируется только через invite token.</p>

        <form onSubmit={onJoin} className="stack">
          <input className="input" placeholder="Invite token" value={token} onChange={(e) => setToken(e.target.value)} />
          <input className="input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input
            className="input"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            className="input"
            placeholder="Display name (optional)"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <button className="btn" type="submit">
            Присоединиться
          </button>
        </form>

        <p className="muted">Invite status: {status || "unknown"}</p>
        {message ? <p className="muted">{message}</p> : null}
      </section>
    </main>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<main><section className="card">Loading...</section></main>}>
      <JoinPageInner />
    </Suspense>
  );
}
