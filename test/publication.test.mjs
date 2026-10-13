import assert from "node:assert/strict";
import test from "node:test";
import { publishCandidate } from "../scripts/publication.mjs";

const candidate = {
  name: "@avgeek-oss/example",
  version: "1.0.0",
  integrity: "sha512-verified-bytes",
};

test("a missing npm version publishes the verified candidate once", async () => {
  let publications = 0;
  const result = await publishCandidate(
    candidate,
    () => publications++,
    async (url) => {
      assert.equal(
        url,
        "https://registry.npmjs.org/%40avgeek-oss%2Fexample/1.0.0",
      );
      return new Response(null, { status: 404 });
    },
  );
  assert.equal(result, "published");
  assert.equal(publications, 1);
});

test("retrying an identical verified version does not publish again", async () => {
  let publications = 0;
  const result = await publishCandidate(
    candidate,
    () => publications++,
    async () => Response.json({ dist: { integrity: candidate.integrity } }),
  );
  assert.equal(result, "existing");
  assert.equal(publications, 0);
});

test("registry failures or different published bytes cannot trigger a publish", async () => {
  let publications = 0;
  for (const registryFetch of [
    async () => new Response(null, { status: 403 }),
    async () => new Response(null, { status: 500 }),
    async () =>
      Response.json({ dist: { integrity: "sha512-different-bytes" } }),
    async () => Response.json({}),
    async () => {
      throw new Error("Network unavailable");
    },
  ]) {
    await assert.rejects(
      publishCandidate(candidate, () => publications++, registryFetch),
    );
  }
  assert.equal(publications, 0);
});
