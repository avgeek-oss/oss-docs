import "./check-release.mjs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { publishCandidate } from "./publication.mjs";

const manifest = JSON.parse(await readFile("package.json", "utf8"));
const report = JSON.parse(await readFile("artifacts/package.json", "utf8"));
assert.equal(report.name, manifest.name);
assert.equal(report.version, manifest.version);
assert.equal(
  report.filename,
  `avgeek-oss-mintlify-docs-${manifest.version}.tgz`,
);
const tarball = `./artifacts/${report.filename}`;
assert.equal(
  report.integrity,
  `sha512-${createHash("sha512")
    .update(await readFile(tarball))
    .digest("base64")}`,
);
const result = await publishCandidate(report, () => {
  execFileSync(
    "npm",
    [
      "publish",
      tarball,
      "--ignore-scripts",
      "--access=public",
      "--registry=https://registry.npmjs.org",
    ],
    { stdio: "inherit" },
  );
});
console.log(
  result === "existing"
    ? "The verified version is already on npm."
    : "Published the verified version to npm.",
);
