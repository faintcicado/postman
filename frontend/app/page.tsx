"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { DigestResponse, EmailDigest, Priority } from "./types";
import { loadArchived, saveArchived } from "@/lib/archive";
import { DaySummary } from "@/components/DaySummary";
import { PriorityGroup } from "@/components/PriorityGroup";

const PRIORITY_ORDER: Priority[] = ["action_required", "fyi", "low"];

export default function Home() {
  const { data: session, status } = useSession();
  const [digest, setDigest] = useState<DigestResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archivedMap, setArchivedMap] = useState<Record<string, EmailDigest>>({});

  useEffect(() => {
    setArchivedMap(loadArchived());
  }, []);

  useEffect(() => {
    if (status === "authenticated" && session?.accessToken) {
      fetchDigest();
    }
  }, [status, session?.accessToken]);

  async function fetchDigest() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/digest/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session!.accessToken}`,
          "X-User-Email": session!.user?.email ?? "",
        },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(res.status === 403 && body.detail === "GMAIL_SCOPE_MISSING"
          ? "GMAIL_SCOPE_MISSING"
          : body.detail ?? `HTTP ${res.status}`);
      }
      setDigest(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function handleArchive(email: EmailDigest) {
    const updated = { ...archivedMap, [email.id]: email };
    saveArchived(updated);
    setArchivedMap(updated);
  }

  if (status === "loading") {
    return <LoadingScreen message="Checking session..." />;
  }

  if (session?.error === "RefreshAccessTokenError") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <p className="text-gray-600">Your session expired and could not be renewed.</p>
        <button
          onClick={() => signIn("google")}
          className="rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700"
        >
          Sign in again
        </button>
      </main>
    );
  }

  if (status === "unauthenticated") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
        <h1 className="text-3xl font-bold">Postman</h1>
        <p className="text-gray-500">Your AI-powered email digest</p>
        <button
          onClick={() => signIn("google")}
          className="rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700"
        >
          Sign in with Google
        </button>
      </main>
    );
  }

  const visibleEmails = digest?.emails.filter((e) => !(e.id in archivedMap)) ?? [];

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Postman</h1>
          <p className="text-sm text-gray-400">{session?.user?.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/history" className="text-sm text-gray-400 hover:text-gray-600">
            History
          </Link>
          <Link href="/archived" className="text-sm text-gray-400 hover:text-gray-600">
            Archived
          </Link>
          <button
            onClick={fetchDigest}
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button onClick={() => signOut()} className="text-sm text-gray-400 hover:text-gray-600">
            Sign out
          </button>
        </div>
      </header>

      {loading && !digest && <LoadingScreen message="Fetching your emails…" />}
      {error && (
        error === "GMAIL_SCOPE_MISSING" ? (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-4 text-sm text-yellow-800">
            <p className="font-medium">Gmail access not granted.</p>
            <p className="mt-1 text-yellow-700">Please re-authorize to allow Postman to read your inbox.</p>
            <button
              onClick={() => signIn("google")}
              className="mt-3 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700"
            >
              Re-authorize Gmail access
            </button>
          </div>
        ) : (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )
      )}

      {digest && (
        <div className="flex flex-col gap-8">
          <DaySummary summary={digest.day_summary} cached={digest.cached} />
          {visibleEmails.length === 0 ? (
            <p className="text-center text-sm text-gray-400">All caught up — no emails left.</p>
          ) : (
            PRIORITY_ORDER.map((priority) => (
              <PriorityGroup
                key={priority}
                priority={priority}
                emails={visibleEmails.filter((e) => e.priority === priority)}
                onArchive={handleArchive}
              />
            ))
          )}
        </div>
      )}
    </main>
  );
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center text-gray-400">
      {message}
    </div>
  );
}
