import fs from "fs";
import path from "path";

let loaded = false;

/**
 * On AWS Amplify Hosting's SSR compute, Next.js's own implicit loading of
 * .env.production.local (written by amplify.yml at build time, since
 * Amplify's Console env vars only reach the build shell, not the deployed
 * Lambda's process.env) has proven to race with this app's own modules —
 * AUTH_SECRET/DATABASE_URL come back present on some cold starts and
 * undefined on others, with no code change in between. Loading the file
 * ourselves, synchronously, before anything reads process.env removes that
 * race. Call this at the very top of any module that reads AUTH_SECRET or
 * DATABASE_URL from process.env at module-load time (auth.ts, prisma.ts).
 */
export function ensureRuntimeEnvLoaded() {
  if (loaded) return;
  loaded = true;

  let raw: string;
  try {
    raw = fs.readFileSync(path.join(process.cwd(), ".env.production.local"), "utf8");
  } catch {
    return; // Not present locally/in dev — process.env (from .env) is used instead.
  }

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}
