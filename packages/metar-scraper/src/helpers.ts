/**
 * Shared helpers for the metar-scraper routes.
 */

import path from "path";
import fs from "fs";

/** Base path to the x-follow-grabber project */
export function getXFGPath(): string {
  const p = process.env.XFOLLOWGRABBER_PATH ?? "/Users/jerry/Desktop/x-follow-grabber";
  if (!fs.existsSync(p)) {
    throw new Error(`XFOLLOWGRABBER_PATH not found: ${p}`);
  }
  return p;
}

/** Build a standard JSON response envelope */
export function envelope<T>(
  data: T,
  meta: { count?: number; source: string; [k: string]: unknown }
) {
  return {
    data,
    meta: {
      count: Array.isArray(data) ? data.length : undefined,
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

/** Return full path to a followers CSV for a given username */
export function followersCSVPath(username: string): string {
  const base = getXFGPath();
  return path.join(base, "output", "followers", `${username}.csv`);
}

/**
 * Parse a simple CSV string into an array of objects.
 * Handles quoted fields and commas within quotes (basic RFC4180).
 */
export function parseCSV(raw: string): Record<string, string>[] {
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitCSVLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = splitCSVLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] ?? "";
    });
    return obj;
  });
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
