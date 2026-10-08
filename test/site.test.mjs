import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineSite, validateNavigation } from "../src/index.mjs";
import { syncSite } from "../bin/oss-docs.mjs";

const input = JSON.parse(
  await readFile(
    new URL("../examples/site/site.json", import.meta.url),
    "utf8",
  ),
);

test("native category navigation preserves nesting and rejects ambiguous routes", () => {
  const tree = {
    dropdowns: [
      {
        dropdown: "Guide",
        groups: [
          {
            group: "Start",
            pages: ["guide", { group: "Advanced", pages: ["reference"] }],
          },
        ],
      },
    ],
  };
  assert.deepEqual(validateNavigation(tree), ["guide", "reference"]);
  tree.dropdowns[0].groups[0].pages.push("guide");
  assert.throws(() => validateNavigation(tree), /Duplicate/);
  assert.throws(() => validateNavigation({ dropdowns: [] }), /categories/);
});

test("site defaults preserve product-owned data without mutating input", () => {
  const original = structuredClone(input);
  const config = defineSite(input);
  assert.equal(config.theme, "mint");
  assert.equal(config.interaction.drilldown, false);
  assert.deepEqual(config.navigation, original.navigation);
  config.footer.links[0].items[0].label = "Changed";
  assert.deepEqual(input, original);
  assert.throws(() => defineSite({ ...input, navbar: {} }), /CTA/);
});

test("generated files survive packaging, detect drift and leave app content intact", async () => {
  const dir = await mkdtemp(join(tmpdir(), "oss-docs-"));
  try {
    const config = join(dir, "site.json");
    await writeFile(config, JSON.stringify(input));
    await writeFile(join(dir, "guide.mdx"), "Product-owned content");
    await syncSite({ config, dir });
    await syncSite({ config, dir, check: true });
    const goldCss = await readFile(join(dir, "oss-docs.css"), "utf8");
    assert.match(goldCss, /--oss-primary: #b08505/u);
    const header = await readFile(join(dir, "oss-docs.js"), "utf8");
    assert(header.includes(JSON.stringify(input.name)));
    const manifest = JSON.parse(
      await readFile(join(dir, ".oss-docs.json"), "utf8"),
    );
    assert.equal(manifest.package, "@avgeek-oss/docs");
    assert.equal(
      await readFile(join(dir, "guide.mdx"), "utf8"),
      "Product-owned content",
    );
    await writeFile(join(dir, "oss-docs.css"), "manual edit");
    await assert.rejects(
      syncSite({ config, dir, check: true }),
      /oss-docs.css/,
    );
    await syncSite({ config, dir });
    await syncSite({ config, dir, check: true });
    await writeFile(
      config,
      JSON.stringify({
        ...input,
        colors: { primary: "#F2CD51", light: "#77520A", dark: "#E0B84A" },
      }),
    );
    await syncSite({ config, dir });
    const brightCss = await readFile(join(dir, "oss-docs.css"), "utf8");
    assert.match(brightCss, /--oss-primary: #77520a/u);
    assert.match(brightCss, /--oss-heading-accent: #77520a/u);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("SEO retains per-page metadata defaults and validates the canonical origin", () => {
  const config = defineSite({
    ...input,
    seo: {
      metatags: {
        canonical: "https://docs.example.test",
        "og:site_name": "Product",
      },
    },
  });
  assert.equal(config.seo.indexing, "all");
  assert.equal(config.seo.metatags["twitter:card"], "summary_large_image");
  assert.equal(config.seo.metatags["og:site_name"], "Product");
  assert.throws(
    () =>
      defineSite({
        ...input,
        seo: { metatags: { canonical: "https://docs.example.test/guide" } },
      }),
    /origin/,
  );
});
