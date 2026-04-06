"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { HistoryEntry, Priority } from "@/app/types";
import { DigestCard } from "@/components/DigestCard";

const PRIORITY_ORDER: Priority[] = ["action_required", "fyi", "low"];

function formatDate(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function HistoryPage() {
  const { data: session, status } = useSession();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated") fetchHistory();
  }, [status]);

  async function fetchHistory() {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/digest/history`, {
        headers: { "X-User-Email": session!.user?.email ?? "" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setEntries(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">History</h1>
          <p className="text-sm text-gray-400">Past 30 digests</p>
        </div>
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">
          ← Back to digest
        </Link>
      </header>

      {loading && (
        <p className="text-center text-sm text-gray-400">Loading history…</p>
      )}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {!loading && entries.length === 0 && (
        <p className="text-center text-sm text-gray-400">No past digests yet.</p>
      )}

      <div className="flex flex-col gap-4">
        {entries.map((entry) => {
          const isOpen = expanded === entry.date;
          const actionCount = entry.emails.filter((e) => e.priority === "action_required").length;

          return (
            <div key={entry.date} className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <button
                onClick={() => setExpanded(isOpen ? null : entry.date)}
                className="flex w-full items-start justify-between px-5 py-4 text-left"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-800">{formatDate(entry.date)}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{entry.day_summary}</p>
                </div>
                <div className="ml-4 flex shrink-0 items-center gap-3">
                  {actionCount > 0 && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      {actionCount} action{actionCount !== 1 ? "s" : ""}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">{entry.emails.length} emails</span>
                  <span className="text-gray-300">{isOpen ? "▲" : "▼"}</span>
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-gray-100 px-5 pb-4 pt-3">
                  {PRIORITY_ORDER.map((priority) => {
                    const group = entry.emails.filter((e) => e.priority === priority);
                    if (group.length === 0) return null;
                    return (
                      <div key={priority} className="mb-4 last:mb-0">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                          {priority === "action_required" ? "Action required" : priority === "fyi" ? "FYI" : "Low"}
                        </p>
                        <div className="flex flex-col gap-2">
                          {group.map((email) => (
                            <DigestCard key={email.id} email={email} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
