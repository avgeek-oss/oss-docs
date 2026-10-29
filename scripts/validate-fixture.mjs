// Runs Mintlify's pinned validate, broken-links and a11y checks against the
// kit's generated output for the test fixture site. Needs network access.
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { syncSite, validateSite } from "../src/index.mjs";
import { writeFixtureSite } from "../test/fixtures/site.mjs";

const root = await mkdtemp(join(tmpdir(), "mintlify-docs-validate-"));
try {
  const site = await writeFixtureSite(root);
  await syncSite(site);
  for (const command of await validateSite({ dir: site.dir }))
    console.log(`Passed ${command}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await rm(root, { recursive: true, force: true });
}
