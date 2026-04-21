"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { API_BASE_URL, parseJson } from "../../lib/api";

type AuthResponse = {
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
    displayName?: string;
  };
};

export default function TrainerAuthPage() {
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const endpoint = mode === "signup" ? "/auth/trainer/signup" : "/auth/login";
      const payload =
        mode === "signup"
          ? { email, password, displayName: displayName || undefined }
          : { email, password };
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await parseJson<AuthResponse>(res);
      localStorage.setItem("trainerToken", data.token);
      setMessage("Успешно. Токен сохранен, переходи к созданию группы и invite.");
    } catch (error) {
      const text = error instanceof Error ? error.message : "auth_failed";
      setMessage(`Ошибка: ${text}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <section className="card">
        <h1 className="title">Trainer Auth</h1>
        <p className="muted">Роль тренера задается через обычный signup/login.</p>

        <div className="row">
          <button className="btn secondary" onClick={() => setMode("signup")} type="button">
            Signup
          </button>
          <button className="btn secondary" onClick={() => setMode("login")} type="button">
            Login
          </button>
        </div>

        <form onSubmit={onSubmit} className="stack">
          {mode === "signup" ? (
            <input
              className="input"
              placeholder="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          ) : null}
          <input className="input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input
            className="input"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="btn" disabled={loading} type="submit">
            {loading ? "..." : mode === "signup" ? "Создать аккаунт тренера" : "Войти"}
          </button>
        </form>

        {message ? <p className="muted">{message}</p> : null}

        <p className="muted">
          Дальше: <Link href="/trainer/groups">Группы и Invite</Link>
        </p>
      </section>
    </main>
  );
}
