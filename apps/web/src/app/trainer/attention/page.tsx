"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { API_BASE_URL, parseJson } from "../../lib/api";

type QueueItem = {
  id: string;
  ruleCode: string;
  activatedAt: string;
  explanation: unknown;
  student: {
    id: string;
    email: string;
    displayName?: string | null;
  };
};

export default function TrainerAttentionPage() {
  const token = useMemo(() => (typeof window !== "undefined" ? localStorage.getItem("trainerToken") : null), []);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function loadQueue() {
    if (!token) {
      setMessage("Нужен trainer token. Сначала /trainer/auth.");
      return;
    }
    const res = await fetch(`${API_BASE_URL}/trainer/attention-queue`, {
      headers: { authorization: `Bearer ${token}` }
    });
    const data = await parseJson<{ items: QueueItem[] }>(res);
    setItems(data.items);
  }

  useEffect(() => {
    loadQueue().catch((error) => setMessage(error instanceof Error ? error.message : "queue_load_failed"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function resolveTrigger(event: FormEvent, triggerId: string) {
    event.preventDefault();
    try {
      if (!token) throw new Error("missing_trainer_token");
      const note = notes[triggerId] ?? "";
      const res = await fetch(`${API_BASE_URL}/trainer/triggers/${triggerId}/resolve`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ note: note || "handled" })
      });
      await parseJson(res);
      setMessage("Триггер обработан.");
      await loadQueue();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "resolve_failed");
    }
  }

  return (
    <main>
      <section className="card stack">
        <h1 className="title">Attention Queue</h1>
        <p className="muted">Активные триггеры студентов, требующие действия тренера.</p>

        {items.length === 0 ? <p className="muted">Очередь пуста.</p> : null}

        {items.map((item) => (
          <article key={item.id} className="card stack">
            <strong>{item.student.displayName || item.student.email}</strong>
            <p className="muted">rule: {item.ruleCode}</p>
            <p className="muted">activated: {new Date(item.activatedAt).toLocaleString()}</p>
            <code>{JSON.stringify(item.explanation)}</code>

            <form onSubmit={(e) => resolveTrigger(e, item.id)} className="stack">
              <textarea
                className="input"
                placeholder="Комментарий тренера"
                value={notes[item.id] ?? ""}
                onChange={(e) => setNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
              />
              <button className="btn" type="submit">
                Пометить как обработанный
              </button>
            </form>
          </article>
        ))}

        {message ? <p className="muted">{message}</p> : null}
        <p className="muted">
          Назад: <Link href="/trainer/groups">Groups</Link>
        </p>
      </section>
    </main>
  );
}
