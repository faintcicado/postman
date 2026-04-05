interface Props {
  summary: string;
  cached: boolean;
}

export function DaySummary({ summary, cached }: Props) {
  return (
    <div className="rounded-xl bg-indigo-600 px-6 py-5 text-white shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-200">
            Today in a nutshell
          </p>
          <p className="mt-1 text-lg font-medium leading-snug">{summary}</p>
        </div>
        {cached && (
          <span className="mt-0.5 shrink-0 rounded-full bg-indigo-500 px-2 py-0.5 text-xs text-indigo-100">
            cached
          </span>
        )}
      </div>
    </div>
  );
}
