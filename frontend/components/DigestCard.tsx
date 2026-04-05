import type { EmailDigest, Priority } from "@/app/types";

const PRIORITY_STYLES: Record<Priority, { badge: string; border: string }> = {
  action_required: {
    badge: "bg-red-100 text-red-700",
    border: "border-l-red-500",
  },
  fyi: {
    badge: "bg-yellow-100 text-yellow-700",
    border: "border-l-yellow-400",
  },
  low: {
    badge: "bg-gray-100 text-gray-500",
    border: "border-l-gray-300",
  },
};

const PRIORITY_LABELS: Record<Priority, string> = {
  action_required: "Action required",
  fyi: "FYI",
  low: "Low",
};

interface Props {
  email: EmailDigest;
}

export function DigestCard({ email }: Props) {
  const styles = PRIORITY_STYLES[email.priority];

  return (
    <div
      className={`rounded-lg border border-gray-200 border-l-4 ${styles.border} bg-white px-5 py-4 shadow-sm`}
    >
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles.badge}`}>
          {PRIORITY_LABELS[email.priority]}
        </span>
        {email.deadline && (
          <span className="text-xs text-gray-400">Due: {email.deadline}</span>
        )}
      </div>
      <p className="mt-2 text-sm text-gray-800">{email.summary}</p>
      {email.action && (
        <p className="mt-1.5 text-xs font-medium text-indigo-600">→ {email.action}</p>
      )}
    </div>
  );
}
