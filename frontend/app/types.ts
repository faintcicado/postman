export type Priority = "action_required" | "fyi" | "low";

export interface EmailDigest {
  id: string;
  priority: Priority;
  summary: string;
  action: string | null;
  deadline: string | null;
}

export interface DigestResponse {
  day_summary: string;
  emails: EmailDigest[];
  cached: boolean;
}
