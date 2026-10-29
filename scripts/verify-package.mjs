import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cp, mkdir, readFile, rm, mkdtemp, writeFile } from "node:fs/promises";
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
  // Copy the example's sources, not its generated files, so the installed
  // CLI regenerates everything outside this checkout.
  const exampleManifest = JSON.parse(
    await readFile("examples/site/.oss-docs.json", "utf8"),
  );
  const generatedFiles = new Set(
    [...Object.keys(exampleManifest.files), ".oss-docs.json"].map((name) =>
      resolve("examples/site", name),
    ),
  );
  const examples = join(dir, "examples");
  await cp("examples", examples, {
    recursive: true,
    filter: (source) => !generatedFiles.has(resolve(source)),
  });
  const site = join(examples, "site/site.json");
  const content = join(examples, "site");
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
  assert.deepEqual(generatedManifest.files, exampleManifest.files);
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
