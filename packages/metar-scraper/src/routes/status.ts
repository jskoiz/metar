/**
 * GET /x/scrape/status
 * Returns current x-follow-grabber job status (running processes, output files).
 */

import { Router } from "express";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { envelope, getXFGPath } from "../helpers.js";

export const statusRouter = Router();

statusRouter.get("/", async (_req, res) => {
  try {
    const xfgPath = getXFGPath();
    const outputDir = path.join(xfgPath, "output");

    // Gather output directory stats
    const outputStats: Record<string, { files: number; latestFile?: string; latestMtime?: string }> = {};
    const subdirs = ["followers", "mentions", "replies"];

    for (const sub of subdirs) {
      const subPath = path.join(outputDir, sub);
      if (fs.existsSync(subPath)) {
        const files = fs.readdirSync(subPath).filter((f) => f.endsWith(".csv") || f.endsWith(".xlsx"));
        let latestFile: string | undefined;
        let latestMtime: string | undefined;

        if (files.length > 0) {
          const sorted = files
            .map((f) => ({ name: f, mtime: fs.statSync(path.join(subPath, f)).mtime }))
            .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
          latestFile = sorted[0].name;
          latestMtime = sorted[0].mtime.toISOString();
        }

        outputStats[sub] = { files: files.length, latestFile, latestMtime };
      } else {
        outputStats[sub] = { files: 0 };
      }
    }

    // Check for database
    const dbExists = fs.existsSync(path.join(outputDir, "database.sqlite"));

    // Check for error log
    let recentErrors: string[] = [];
    const errorLog = path.join(xfgPath, "error.log");
    if (fs.existsSync(errorLog)) {
      const content = fs.readFileSync(errorLog, "utf-8");
      recentErrors = content
        .split("\n")
        .filter(Boolean)
        .slice(-10);
    }

    const status = {
      xfgPath,
      database: dbExists ? "present" : "missing",
      outputStats,
      recentErrors,
    };

    res.json(envelope(status, { source: "filesystem" }));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});
