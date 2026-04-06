import type { EmailDigest } from "@/app/types";

export const ARCHIVE_KEY = "postman_archived";

export function loadArchived(): Record<string, EmailDigest> {
  try {
    return JSON.parse(localStorage.getItem(ARCHIVE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function saveArchived(data: Record<string, EmailDigest>): void {
  localStorage.setItem(ARCHIVE_KEY, JSON.stringify(data));
}
