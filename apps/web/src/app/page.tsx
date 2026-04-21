import Link from "next/link";

export default function Page() {
  return (
    <main>
      <section className="card stack">
        <h1 className="title">Kachkozavr MVP</h1>
        <p className="muted">
          Быстрые входы в текущие MVP экраны.
        </p>
        <Link href="/trainer/auth">/trainer/auth</Link>
        <Link href="/trainer/groups">/trainer/groups</Link>
        <Link href="/trainer/attention">/trainer/attention</Link>
        <Link href="/join">/join</Link>
      </section>
    </main>
  );
}
