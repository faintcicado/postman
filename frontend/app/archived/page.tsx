"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { EmailDigest } from "@/app/types";
import { loadArchived, saveArchived } from "@/lib/archive";
import { DigestCard } from "@/components/DigestCard";

export default function ArchivedPage() {
  const [archivedMap, setArchivedMap] = useState<Record<string, EmailDigest>>({});

  useEffect(() => {
    setArchivedMap(loadArchived());
  }, []);

  function handleUnarchive(email: EmailDigest) {
    const updated = { ...archivedMap };
    delete updated[email.id];
    saveArchived(updated);
    setArchivedMap(updated);
  }

  const archived = Object.values(archivedMap).reverse();

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Archived</h1>
          <p className="text-sm text-gray-400">
            {archived.length} email{archived.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">
          ← Back to digest
        </Link>
      </header>

      {archived.length === 0 ? (
        <p className="text-center text-sm text-gray-400">Nothing archived yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {archived.map((email) => (
            <DigestCard key={email.id} email={email} onArchive={handleUnarchive} archiveLabel="Restore" />
          ))}
        </div>
      )}
    </main>
  );
}
