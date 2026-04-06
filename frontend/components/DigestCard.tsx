import type { EmailDigest, Priority } from "@/app/types";

const PRIORITY_BORDER: Record<Priority, string> = {
  action_required: "border-l-red-500",
  fyi: "border-l-yellow-400",
  low: "border-l-gray-300",
};

const PRIORITY_DOT: Record<Priority, string> = {
  action_required: "bg-red-500",
  fyi: "bg-yellow-400",
  low: "bg-gray-300",
};

interface Props {
  email: EmailDigest;
  onArchive?: (email: EmailDigest) => void;
  archiveLabel?: string;
}

export function DigestCard({ email, onArchive, archiveLabel = "Archive" }: Props) {
  return (
    <div
      className={`rounded-lg border border-gray-200 border-l-4 ${PRIORITY_BORDER[email.priority]} bg-white px-5 py-4 shadow-sm`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOT[email.priority]}`} />
          <span className="truncate text-sm font-semibold text-gray-800">
            {email.sender}
          </span>
          <span className="shrink-0 text-xs text-gray-400">{email.date}</span>
          {email.deadline && (
            <span className="shrink-0 text-xs text-orange-400">· due {email.deadline}</span>
          )}
        </div>
        {onArchive && (
          <button
            onClick={() => onArchive(email)}
            className="shrink-0 rounded px-2 py-0.5 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            {archiveLabel}
          </button>
        )}
      </div>
      <p className="mt-2 text-sm text-gray-600">{email.summary}</p>
      {email.action && (
        <p className="mt-1.5 text-xs font-medium text-indigo-600">→ {email.action}</p>
      )}
    </div>
  );
}
