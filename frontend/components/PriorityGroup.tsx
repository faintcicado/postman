import type { EmailDigest, Priority } from "@/app/types";
import { DigestCard } from "./DigestCard";

const GROUP_TITLES: Record<Priority, string> = {
  action_required: "Needs your attention",
  fyi: "Good to know",
  low: "Low priority",
};

interface Props {
  priority: Priority;
  emails: EmailDigest[];
  onArchive: (email: EmailDigest) => void;
}

export function PriorityGroup({ priority, emails, onArchive }: Props) {
  if (emails.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
        {GROUP_TITLES[priority]} ({emails.length})
      </h2>
      <div className="flex flex-col gap-3">
        {emails.map((email) => (
          <DigestCard key={email.id} email={email} onArchive={onArchive} />
        ))}
      </div>
    </section>
  );
}
