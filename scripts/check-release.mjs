import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
const { name, version } = JSON.parse(await readFile("package.json", "utf8"));
assert(/^\d+\.\d+\.\d+$/.test(version));
assert.equal(process.env.GITHUB_REF_NAME, `v${version}`);
if (
  process.argv.includes("--candidate") ||
  process.argv.includes("--published")
) {
  const packed = JSON.parse(await readFile("artifacts/package.json", "utf8"));
  assert.equal(packed.name, name);
  assert.equal(packed.version, version);
  const tarball = await readFile(`artifacts/${packed.filename}`);
  const integrity = `sha512-${createHash("sha512").update(tarball).digest("base64")}`;
  assert.equal(integrity, packed.integrity);
  if (process.argv.includes("--published")) {
    const published = JSON.parse(
      execFileSync(
        "npm",
        [
          "view",
          `${name}@${version}`,
          "dist.integrity",
          "--json",
          "--registry=https://npm.pkg.github.com",
        ],
        { encoding: "utf8" },
      ),
    );
    assert.equal(published, integrity);
  }
}
