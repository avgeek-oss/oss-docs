// Writes the test fixture site into .preview/ and syncs it, so `pnpm dev` can
// serve the kit's current output with Mintlify. .preview/ is not committed.
import { rm } from "node:fs/promises";
import { syncSite } from "../src/index.mjs";
import { writeFixtureSite } from "../test/fixtures/site.mjs";

await rm(".preview", { recursive: true, force: true });
await syncSite(await writeFixtureSite(".preview"));
