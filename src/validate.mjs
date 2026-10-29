import { spawn } from "node:child_process";
import { resolve } from "node:path";

// The Mintlify CLI version every consumer validates with.
export const mintVersion = "4.2.986";

export const validationCommands = Object.freeze([
  ["validate"],
  ["broken-links", "--check-anchors", "--check-redirects", "--check-snippets"],
  ["a11y"],
]);

function runNpx(args, { cwd }) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn("npx", args, { cwd, stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code, signal) => resolvePromise(signal ? 1 : code));
  });
}

// Runs Mintlify's validate, broken-links and a11y checks with the pinned CLI
// and reports every command that failed.
export async function validateSite({ dir, run = runNpx }) {
  const cwd = resolve(dir);
  const failed = [];
  for (const command of validationCommands) {
    const args = ["--yes", `mint@${mintVersion}`, ...command];
    const code = await run(args, { cwd });
    if (code !== 0)
      failed.push(`mint ${command.join(" ")} exited with ${code}`);
  }
  if (failed.length)
    throw new Error(
      `Mintlify ${mintVersion} validation failed:\n${failed.join("\n")}`,
    );
  return validationCommands.map((command) => `mint ${command.join(" ")}`);
}
