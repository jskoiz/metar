/**
 * GET /x/scrape/mentions
 *
 * Triggers the x-follow-grabber scan job and returns status / job info.
 * The scan job monitors recent mentions from configured X accounts.
 */

import { Router, Request, Response } from "express";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { envelope, getXFGPath } from "../helpers.js";

export const mentionsRouter = Router();

mentionsRouter.get("/", async (_req: Request, res: Response) => {
  let xfgPath: string;
  try {
    xfgPath = getXFGPath();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(503).json({ error: message });
    return;
  }

  // Check if a recent output file exists (from a prior scan)
  const outputDir = path.join(xfgPath, "output", "mentions");
  let existingFiles: string[] = [];
  if (fs.existsSync(outputDir)) {
    existingFiles = fs
      .readdirSync(outputDir)
      .filter((f) => f.endsWith(".csv") || f.endsWith(".json"))
      .sort()
      .reverse()
      .slice(0, 5);
  }

  // Trigger the scan job via `npm run scan` in x-follow-grabber
  const child = spawn("npm", ["run", "scan"], {
    cwd: xfgPath,
    detached: true,
    stdio: "ignore",
    env: { ...process.env },
    shell: true,
  });
  child.unref();

  res.status(202).json(
    envelope(
      {
        job: "scan",
        status: "triggered",
        recentOutputFiles: existingFiles,
      },
      {
        source: "job-triggered",
        cwd: xfgPath,
        note: "Mention scan job started. Poll /x/scrape/status for progress.",
        timestamp: new Date().toISOString(),
      }
    )
  );
});
