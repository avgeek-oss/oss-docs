import { execFileSync } from "node:child_process";
import { setTimeout } from "node:timers/promises";

// The registry can take a few minutes to serve a version right after it is
// published: first its metadata, then its tarball. Runs npm with these
// arguments, retrying a "not found" answer for up to two minutes, as
// oss-ds-web does. Any other failure is thrown at once.
export async function npmWhenVisible(args, label) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return execFileSync("npm", args, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (error) {
      const stderr = String(error?.stderr ?? "");
      process.stderr.write(stderr);
      if (attempt === 12 || !/\b(ETARGET|E404)\b/.test(stderr)) throw error;
      console.log(
        `${label} is not visible on the registry yet (attempt ${attempt}); retrying in 10s`,
      );
      await setTimeout(10_000);
    }
  }
}
