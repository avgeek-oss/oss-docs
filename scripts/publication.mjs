import assert from "node:assert/strict";

export async function publishCandidate(
  candidate,
  publish,
  registryFetch = fetch,
) {
  const url = `https://registry.npmjs.org/${encodeURIComponent(candidate.name)}/${candidate.version}`;
  const response = await registryFetch(url, {
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });
  if (response.status === 404) {
    await publish();
    return "published";
  }
  if (!response.ok)
    throw new Error(`Could not check the npm version: HTTP ${response.status}`);
  const existing = await response.json();
  assert.equal(
    existing?.dist?.integrity,
    candidate.integrity,
    "The existing npm version must match the verified tarball",
  );
  return "existing";
}
