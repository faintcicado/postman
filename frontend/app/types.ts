export type Priority = "action_required" | "fyi" | "low";

export interface EmailDigest {
  id: string;
  priority: Priority;
  summary: string;
  action: string | null;
  deadline: string | null;
  sender: string;
  date: string;
}

export interface DigestResponse {
  day_summary: string;
  emails: EmailDigest[];
  cached: boolean;
}

export interface HistoryEntry {
  date: string;
  day_summary: string;
  emails: EmailDigest[];
}
