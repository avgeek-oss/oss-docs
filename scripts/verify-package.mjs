import { execFileSync } from "node:child_process";
import { mkdir, readFile, rm, mkdtemp, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
await mkdir("artifacts", { recursive: true });
const [packed] = JSON.parse(
  execFileSync(
    "npm",
    ["pack", "--json", "--pack-destination", "artifacts", "--ignore-scripts"],
    { encoding: "utf8" },
  ),
);
await writeFile("artifacts/package.json", JSON.stringify(packed, null, 2));
const dir = await mkdtemp(join(tmpdir(), "oss-docs-consumer-"));
try {
  await writeFile(
    join(dir, "package.json"),
    JSON.stringify({ private: true, type: "module" }),
  );
  execFileSync(
    "npm",
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      resolve("artifacts", packed.filename),
    ],
    { cwd: dir, stdio: "pipe" },
  );
  const site = join(dir, "site.json");
  await writeFile(site, await readFile("examples/site/site.json"));
  const bin = join(dir, "node_modules/@avgeek-oss/docs/bin/oss-docs.mjs");
  for (const command of ["sync", "check"])
    execFileSync(
      process.execPath,
      [bin, command, "--config", site, "--dir", dir],
      { stdio: "inherit" },
    );
  console.log(
    "Verified packed package from a fresh consumer outside this checkout.",
  );
} finally {
  await rm(dir, { recursive: true, force: true });
}
