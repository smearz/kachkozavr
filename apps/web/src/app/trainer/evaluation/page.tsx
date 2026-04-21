"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { API_BASE_URL, parseJson } from "../../lib/api";

export default function TrainerEvaluationPage() {
  const token = useMemo(() => (typeof window !== "undefined" ? localStorage.getItem("trainerToken") : null), []);
  const [studentId, setStudentId] = useState("");
  const [result, setResult] = useState<any>(null);
  const [message, setMessage] = useState("");

  async function onLoad(event: FormEvent) {
    event.preventDefault();
    try {
      if (!token) throw new Error("missing_trainer_token");
      const res = await fetch(`${API_BASE_URL}/trainer/students/${studentId}/program-evaluation`, {
        headers: { authorization: `Bearer ${token}` }
      });
      const data = await parseJson<any>(res);
      setResult(data);
      setMessage("");
    } catch (error) {
      setResult(null);
      setMessage(error instanceof Error ? error.message : "evaluation_load_failed");
    }
  }

  return (
    <main>
      <section className="card stack">
        <h1 className="title">Program Evaluation</h1>
        <p className="muted">Базовая оценка назначения по adherence, plan-vs-actual и trends.</p>

        <form onSubmit={onLoad} className="row">
          <input
            className="input"
            placeholder="Student ID"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          />
          <button className="btn" type="submit">
            Показать
          </button>
        </form>

        {message ? <p className="muted">{message}</p> : null}

        {result ? (
          <div className="stack">
            <strong>{result.assignment.program.name}</strong>
            <p className="muted">
              adherence: {result.adherence.adherenceRate}% ({result.adherence.completedCount} completed,{" "}
              {result.adherence.partialCount} partial, {result.adherence.skippedCount} skipped)
            </p>
            <p className="muted">
              avg deltas: reps {String(result.planVsActual.overall.avgRepsDelta)}, weight{" "}
              {String(result.planVsActual.overall.avgWeightDelta)}
            </p>
            <code>{JSON.stringify(result, null, 2)}</code>
          </div>
        ) : null}

        <p className="muted">
          Назад: <Link href="/trainer/attention">Attention Queue</Link>
        </p>
      </section>
    </main>
  );
}
