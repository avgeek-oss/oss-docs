import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, rm, mkdtemp, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { writeFixtureSite } from "../test/fixtures/site.mjs";
const manifest = JSON.parse(await readFile("package.json", "utf8"));
const published = process.argv.includes("--published");
await mkdir("artifacts", { recursive: true });
const dir = await mkdtemp(join(tmpdir(), "mintlify-docs-consumer-"));
try {
  const destination = published ? dir : "artifacts";
  const [packed] = JSON.parse(
    execFileSync(
      "npm",
      [
        "pack",
        published ? `${manifest.name}@${manifest.version}` : ".",
        "--registry=https://registry.npmjs.org",
        "--json",
        "--pack-destination",
        destination,
        "--ignore-scripts",
      ],
      { encoding: "utf8" },
    ),
  );
  assert.equal(packed.name, manifest.name);
  assert.equal(packed.version, manifest.version);
  if (published) {
    const candidate = JSON.parse(
      await readFile("artifacts/package.json", "utf8"),
    );
    assert.equal(packed.integrity, candidate.integrity);
  } else {
    await writeFile("artifacts/package.json", JSON.stringify(packed, null, 2));
  }
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
      resolve(destination, packed.filename),
    ],
    { cwd: dir, stdio: "pipe" },
  );
  // The installed CLI must generate exactly what this checkout generates for
  // the fixture. The verify job records the checkout's hashes next to the
  // tarball; the published check (no dependencies installed) reuses them.
  let expectedFiles;
  if (published) {
    expectedFiles = JSON.parse(
      await readFile("artifacts/fixture-files.json", "utf8"),
    );
  } else {
    const { syncSite } = await import("../src/index.mjs");
    const local = await mkdtemp(join(tmpdir(), "mintlify-docs-local-"));
    try {
      await syncSite(await writeFixtureSite(local));
      expectedFiles = JSON.parse(
        await readFile(join(local, "site/.oss-docs.json"), "utf8"),
      ).files;
    } finally {
      await rm(local, { recursive: true, force: true });
    }
    await writeFile(
      "artifacts/fixture-files.json",
      JSON.stringify(expectedFiles, null, 2),
    );
  }
  const { config: site, dir: content } = await writeFixtureSite(
    join(dir, "fixture"),
  );
  const bin = join(dir, "node_modules/.bin/mintlify-docs");
  for (const args of [["sync"], ["check", "--content"]])
    execFileSync(
      process.execPath,
      [bin, ...args, "--config", site, "--dir", content],
      { stdio: "inherit" },
    );
  const generated = JSON.parse(
    await readFile(join(content, "docs.json"), "utf8"),
  );
  assert.equal(generated.name, "Example");
  const generatedManifest = JSON.parse(
    await readFile(join(content, ".oss-docs.json"), "utf8"),
  );
  assert.equal(generatedManifest.package, manifest.name);
  assert.equal(generatedManifest.version, manifest.version);
  assert.deepEqual(generatedManifest.files, expectedFiles);
  // Consumers import the API from the package root, never from bin/.
  execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      `import { checkSite, syncSite, loadSite, mintVersion } from "${manifest.name}";
const result = await checkSite({ config: ${JSON.stringify(site)}, dir: ${JSON.stringify(content)}, content: true });
if (!result.pages || typeof syncSite !== "function" || typeof loadSite !== "function" || !mintVersion) process.exit(1);`,
    ],
    { cwd: dir, stdio: "inherit" },
  );
  console.log(
    "Verified packed package from a fresh consumer outside this checkout.",
  );
} finally {
  await rm(dir, { recursive: true, force: true });
}
