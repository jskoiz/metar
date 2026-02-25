/**
 * GET /x/scrape/comments/:tweetId
 *
 * Triggers scrapeAllComments.ts in x-follow-grabber for the given tweet ID.
 * Returns 202 with job-queued info immediately.
 */

import { Router, Request, Response } from "express";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { envelope, getXFGPath } from "../helpers.js";

export const commentsRouter = Router();

commentsRouter.get("/:tweetId", async (req: Request, res: Response) => {
  const { tweetId } = req.params;

  if (!tweetId || !/^\d{10,25}$/.test(tweetId)) {
    res.status(400).json({ error: "Invalid tweetId – must be a numeric tweet ID" });
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

  const scriptPath = path.join(xfgPath, "src", "scripts", "scrapeAllComments.ts");

  if (!fs.existsSync(scriptPath)) {
    // Try alternate locations
    const altPaths = [
      path.join(xfgPath, "scrapeAllComments.ts"),
      path.join(xfgPath, "src", "scrapeAllComments.ts"),
    ];
    const foundPath = altPaths.find((p) => fs.existsSync(p));
    if (!foundPath) {
      res.status(503).json({
        error: "scrapeAllComments.ts not found",
        hint: "Ensure x-follow-grabber is set up and the script exists",
        searched: [scriptPath, ...altPaths],
      });
      return;
    }
  }

  // Spawn comment scrape job in background (fire-and-forget)
  const child = spawn(
    "npx",
    ["tsx", scriptPath, "--tweetId", tweetId],
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
        job: "scrapeAllComments",
        tweetId,
        status: "queued",
      },
      {
        source: "job-triggered",
        note: "Comment scrape job queued. Poll /x/scrape/status for progress.",
        timestamp: new Date().toISOString(),
      }
    )
  );
});
