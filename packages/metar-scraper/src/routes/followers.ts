/**
 * GET /x/scrape/followers/:username
 *
 * Returns paginated follower data for a given Twitter/X username.
 *
 * If a pre-scraped CSV exists in x-follow-grabber's output folder it is read
 * directly.  Otherwise a scrape job is triggered via `npx tsx` and the caller
 * receives a job-queued response (202).
 *
 * Query params:
 *   page   – 1-based page number (default: 1)
 *   limit  – results per page    (default: 100, max: 1000)
 */

import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { envelope, followersCSVPath, getXFGPath, parseCSV } from "../helpers.js";

export const followersRouter = Router();

followersRouter.get("/:username", async (req: Request, res: Response) => {
  const { username } = req.params;
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(1000, Math.max(1, Number(req.query.limit ?? 100)));

  if (!username || !/^[A-Za-z0-9_]{1,50}$/.test(username)) {
    res.status(400).json({ error: "Invalid username" });
    return;
  }

  const csvPath = followersCSVPath(username);

  // ── Case 1: CSV already exists → serve it ──────────────────────────────
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
          csvPath,
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
      res.status(500).json({ error: `Failed to read CSV: ${message}` });
      return;
    }
  }

  // ── Case 2: No CSV → trigger scrape job (async) ────────────────────────
  const xfgPath = getXFGPath();
  const scriptPath = path.join(xfgPath, "src", "scripts", "scrape_followers.ts");

  if (!fs.existsSync(scriptPath)) {
    res.status(503).json({
      error: "Scrape script not found",
      hint: "Ensure XFOLLOWGRABBER_PATH is correct and x-follow-grabber is set up",
    });
    return;
  }

  // Spawn scrape job in background (fire-and-forget)
  const child = spawn(
    "npx",
    ["tsx", scriptPath, "--username", username],
    {
      cwd: xfgPath,
      detached: true,
      stdio: "ignore",
      env: { ...process.env },
    }
  );
  child.unref();

  res.status(202).json({
    message: "Scrape job started",
    username,
    note: "Poll this endpoint again in a few minutes once scraping completes",
    meta: {
      source: "job-triggered",
      timestamp: new Date().toISOString(),
    },
  });
});
