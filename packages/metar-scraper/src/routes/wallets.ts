/**
 * GET /x/scrape/wallets/:username
 *
 * Reads existing wallet extraction output for a username,
 * or triggers extract_wallets.ts if no output exists.
 * Returns paginated wallet data.
 *
 * Query params:
 *   page  – 1-based page number (default: 1)
 *   limit – results per page    (default: 100, max: 500)
 */

import { Router, Request, Response } from "express";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { envelope, getXFGPath, parseCSV } from "../helpers.js";

export const walletsRouter = Router();

/** Return the path where wallet extraction output lives for a username */
function walletOutputPath(xfgPath: string, username: string): string {
  return path.join(xfgPath, "output", "wallets", `${username}.csv`);
}

/** Also check JSON format */
function walletOutputPathJSON(xfgPath: string, username: string): string {
  return path.join(xfgPath, "output", "wallets", `${username}.json`);
}

walletsRouter.get("/:username", async (req: Request, res: Response) => {
  const { username } = req.params;
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(500, Math.max(1, Number(req.query.limit ?? 100)));

  if (!username || !/^[A-Za-z0-9_]{1,50}$/.test(username)) {
    res.status(400).json({ error: "Invalid username" });
    return;
  }

  let xfgPath: string;
  try {
    xfgPath = getXFGPath();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(503).json({ error: message });
    return;
  }

  const csvPath = walletOutputPath(xfgPath, username);
  const jsonPath = walletOutputPathJSON(xfgPath, username);

  // ── Case 1: JSON output exists ──────────────────────────────────────────
  if (fs.existsSync(jsonPath)) {
    try {
      const raw = fs.readFileSync(jsonPath, "utf-8");
      const all: unknown[] = JSON.parse(raw);
      const total = all.length;
      const start = (page - 1) * limit;
      const slice = all.slice(start, start + limit);

      res.json(
        envelope(slice, {
          source: "json",
          outputPath: jsonPath,
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
          count: slice.length,
        })
      );
      return;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: `Failed to parse wallet JSON: ${message}` });
      return;
    }
  }

  // ── Case 2: CSV output exists ───────────────────────────────────────────
  if (fs.existsSync(csvPath)) {
    try {
      const raw = fs.readFileSync(csvPath, "utf-8");
      const all = parseCSV(raw);
      const total = all.length;
      const start = (page - 1) * limit;
      const slice = all.slice(start, start + limit);

      res.json(
        envelope(slice, {
          source: "csv",
          outputPath: csvPath,
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
          count: slice.length,
        })
      );
      return;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: `Failed to read wallet CSV: ${message}` });
      return;
    }
  }

  // ── Case 3: No output → trigger extraction job ──────────────────────────
  const scriptPath = path.join(xfgPath, "src", "scripts", "extract_wallets.ts");
  const altPaths = [
    path.join(xfgPath, "src", "extract_wallets.ts"),
    path.join(xfgPath, "extract_wallets.ts"),
  ];
  const resolvedScript = fs.existsSync(scriptPath)
    ? scriptPath
    : altPaths.find((p) => fs.existsSync(p));

  if (!resolvedScript) {
    res.status(503).json({
      error: "extract_wallets.ts not found",
      hint: "Ensure x-follow-grabber is set up",
      searched: [scriptPath, ...altPaths],
    });
    return;
  }

  const child = spawn(
    "npx",
    ["tsx", resolvedScript, "--username", username],
    {
      cwd: xfgPath,
      detached: true,
      stdio: "ignore",
      env: { ...process.env },
    }
  );
  child.unref();

  res.status(202).json(
    envelope(
      {
        job: "extract_wallets",
        username,
        status: "triggered",
      },
      {
        source: "job-triggered",
        note: "Wallet extraction started. Poll this endpoint again in a few minutes.",
        timestamp: new Date().toISOString(),
      }
    )
  );
});
