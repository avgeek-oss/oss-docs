import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, rm, mkdtemp, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
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
  const site = join(dir, "site.json");
  await writeFile(site, await readFile("examples/site/site.json"));
  const bin = join(dir, "node_modules/.bin/mintlify-docs");
  for (const command of ["sync", "check"])
    execFileSync(
      process.execPath,
      [bin, command, "--config", site, "--dir", dir],
      { stdio: "inherit" },
    );
  const generated = JSON.parse(await readFile(join(dir, "docs.json"), "utf8"));
  assert.equal(generated.name, "Example");
  const generatedManifest = JSON.parse(
    await readFile(join(dir, ".oss-docs.json"), "utf8"),
  );
  assert.equal(generatedManifest.package, manifest.name);
  assert.equal(generatedManifest.version, manifest.version);
  assert.equal(Object.keys(generatedManifest.files).length, 5);
  console.log(
    "Verified packed package from a fresh consumer outside this checkout.",
  );
} finally {
  await rm(dir, { recursive: true, force: true });
}
