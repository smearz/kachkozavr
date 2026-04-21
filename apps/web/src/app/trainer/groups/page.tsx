"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { API_BASE_URL, parseJson } from "../../lib/api";

type Group = { id: string; name: string; createdAt: string };

export default function TrainerGroupsPage() {
  const token = useMemo(() => (typeof window !== "undefined" ? localStorage.getItem("trainerToken") : null), []);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupName, setGroupName] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [message, setMessage] = useState("");

  async function loadGroups() {
    if (!token) {
      setMessage("Нужен trainer token. Сначала зайди через /trainer/auth.");
      return;
    }
    const res = await fetch(`${API_BASE_URL}/groups`, {
      headers: { authorization: `Bearer ${token}` }
    });
    const data = await parseJson<{ groups: Group[] }>(res);
    setGroups(data.groups);
    if (!selectedGroupId && data.groups.length > 0) {
      setSelectedGroupId(data.groups[0].id);
    }
  }

  useEffect(() => {
    loadGroups().catch((error) => {
      setMessage(error instanceof Error ? error.message : "groups_load_failed");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createGroup(event: FormEvent) {
    event.preventDefault();
    try {
      if (!token) throw new Error("missing_trainer_token");
      const res = await fetch(`${API_BASE_URL}/groups`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: groupName })
      });
      await parseJson(res);
      setGroupName("");
      setMessage("Группа создана.");
      await loadGroups();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "group_create_failed");
    }
  }

  async function createInvite() {
    try {
      if (!token) throw new Error("missing_trainer_token");
      if (!selectedGroupId) throw new Error("select_group_first");
      const res = await fetch(`${API_BASE_URL}/invites`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          groupId: selectedGroupId,
          expiresInHours: 72,
          maxUses: 1
        })
      });
      const data = await parseJson<{ token: string }>(res);
      const url = `${window.location.origin}/join?token=${encodeURIComponent(data.token)}`;
      setInviteLink(url);
      setMessage("Invite создан.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "invite_create_failed");
    }
  }

  return (
    <main>
      <section className="card stack">
        <h1 className="title">Groups & Invite</h1>
        <p className="muted">Создай группу, выбери её и выпусти invite link для студента.</p>

        <form onSubmit={createGroup} className="row">
          <input
            className="input"
            placeholder="Название группы"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
          <button className="btn" type="submit">
            Создать группу
          </button>
        </form>

        <select
          className="input"
          value={selectedGroupId}
          onChange={(e) => setSelectedGroupId(e.target.value)}
        >
          <option value="">Выбери группу</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>

        <button className="btn" onClick={createInvite} type="button">
          Создать invite link
        </button>

        {inviteLink ? (
          <div className="stack">
            <p className="muted">Ссылка для студента:</p>
            <code>{inviteLink}</code>
          </div>
        ) : null}

        {message ? <p className="muted">{message}</p> : null}
        <p className="muted">
          Студентский экран: <Link href="/join">/join</Link>
        </p>
      </section>
    </main>
  );
}
