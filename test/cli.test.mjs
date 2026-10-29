import assert from "node:assert/strict";
import test from "node:test";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { mintVersion, syncSite, validateSite } from "../src/index.mjs";
import { writeFixtureSite } from "./fixtures/site.mjs";

const run = promisify(execFile);
const bin = new URL("../bin/mintlify-docs.mjs", import.meta.url).pathname;
const root = new URL("../", import.meta.url).pathname;

test("validate runs every pinned Mintlify check and reports each failure", async () => {
  const calls = [];
  const outcome = [0, 1, 2];
  await assert.rejects(
    validateSite({
      dir: "fixture/site",
      run: async (args, options) => {
        calls.push({ args, cwd: options.cwd });
        return outcome[calls.length - 1];
      },
    }),
    (error) => {
      assert.match(error.message, new RegExp(`Mintlify ${mintVersion}`));
      assert.match(error.message, /mint broken-links .* exited with 1/);
      assert.match(error.message, /mint a11y exited with 2/);
      assert.doesNotMatch(error.message, /mint validate exited/);
      return true;
    },
  );
  assert.deepEqual(
    calls.map(({ args }) => args),
    [
      ["--yes", `mint@${mintVersion}`, "validate"],
      [
        "--yes",
        `mint@${mintVersion}`,
        "broken-links",
        "--check-anchors",
        "--check-redirects",
        "--check-snippets",
      ],
      ["--yes", `mint@${mintVersion}`, "a11y"],
    ],
  );
  assert(calls.every(({ cwd }) => cwd.endsWith("/fixture/site")));
  assert.deepEqual(
    await validateSite({ dir: "fixture/site", run: async () => 0 }),
    [
      "mint validate",
      "mint broken-links --check-anchors --check-redirects --check-snippets",
      "mint a11y",
    ],
  );
});

test("the repository previews and validates with the pinned Mintlify version", async () => {
  const { scripts } = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  const workflow = await readFile(
    new URL("../.github/workflows/ci.yml", import.meta.url),
    "utf8",
  );
  const pinned = [
    ...`${scripts.dev}\n${workflow}`.matchAll(/mint@([\d.]+)/g),
  ].map((match) => match[1]);
  assert(pinned.length);
  assert(
    pinned.every((version) => version === mintVersion),
    pinned.join(),
  );
  // CI validates the kit's generated output for the fixture site.
  assert.match(workflow, /run: pnpm validate:fixture$/m);
  assert.equal(
    scripts["validate:fixture"],
    "node scripts/validate-fixture.mjs",
  );
});

test("the CLI checks content and rejects incomplete commands", async () => {
  const temp = await mkdtemp(join(tmpdir(), "oss-docs-cli-"));
  try {
    const { config, dir } = await writeFixtureSite(temp);
    await syncSite({ config, dir });
    const { stdout } = await run(
      process.execPath,
      [
        bin,
        "check",
        "--config",
        "site/site.json",
        "--dir",
        "site",
        "--content",
      ],
      { cwd: temp },
    );
    assert.match(
      stdout,
      /^Checked 7 generated files, 3 pages, \d+ links and 1 screenshot in site$/m,
    );
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
  for (const args of [
    [],
    ["sync", "--dir", "docs"],
    ["check", "--config", "site.json"],
    ["sync", "--config", "site.json", "--dir", "docs", "--content"],
    ["publish", "--config", "site.json", "--dir", "docs"],
    ["check", "--config", "site.json", "--dir", "docs", "--unknown"],
  ])
    await assert.rejects(
      run(process.execPath, [bin, ...args], { cwd: root }),
      (error) => {
        assert.equal(error.code, 1);
        assert.match(error.stderr, /Usage:|Unknown option/);
        return true;
      },
      args.join(" "),
    );
});
