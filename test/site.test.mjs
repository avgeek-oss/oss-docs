import assert from "node:assert/strict";
import test from "node:test";
import {
  mkdir,
  mkdtemp,
  readFile,
  writeFile,
  rm,
  stat,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import * as kit from "@avgeek-oss/mintlify-docs";
import {
  defineSite,
  loadSite,
  syncSite,
  checkSite,
  validateNavigation,
} from "../src/index.mjs";
import { syncSite as legacySyncSite } from "../bin/mintlify-docs.mjs";

const input = JSON.parse(
  await readFile(
    new URL("../examples/site/site.json", import.meta.url),
    "utf8",
  ),
);
// The example without its tooling inputs, so tests control them.
const plain = structuredClone(input);
delete plain.assets;
delete plain.content;
const base = {
  ...plain,
  footer: {
    ...plain.footer,
    links: [
      {
        header: "Documentation",
        items: [{ label: "Get started", href: "/guide" }],
      },
    ],
  },
  navigation: {
    dropdowns: [
      {
        dropdown: "Introduction",
        groups: [{ group: "Get started", pages: ["guide", "reference"] }],
      },
    ],
  },
};

async function fixture(files) {
  const dir = await mkdtemp(join(tmpdir(), "oss-docs-"));
  for (const [name, content] of Object.entries(files)) {
    await mkdir(dirname(join(dir, name)), { recursive: true });
    await writeFile(
      join(dir, name),
      typeof content === "string" || Buffer.isBuffer(content)
        ? content
        : JSON.stringify(content),
    );
  }
  return dir;
}
const exists = (path) =>
  stat(path).then(
    () => true,
    () => false,
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
  tree.dropdowns[0].groups[0].pages = { $include: "pages.json" };
  assert.throws(
    () => validateNavigation(tree),
    /Unresolved navigation include/,
  );
});

test("site defaults preserve product-owned data without mutating input", () => {
  const original = structuredClone(input);
  const config = defineSite(base);
  assert.equal(config.theme, "mint");
  assert.equal(config.interaction.drilldown, false);
  assert.deepEqual(config.colors, original.colors);
  config.footer.links[0].items[0].label = "Changed";
  assert.equal(base.footer.links[0].items[0].label, "Get started");
  assert.throws(() => defineSite({ ...base, navbar: {} }), /CTA/);
});

test("tooling keys configure the kit and never reach docs.json", () => {
  const config = defineSite({
    ...base,
    assets: [{ from: "a.png", to: "assets/a.png" }],
    packageJson: "../package.json",
    content: { standalone: ["privacy"] },
  });
  for (const key of ["assets", "packageJson", "content"])
    assert.equal(key in config, false, key);
});

test("the package root exports the whole public API; bin is only the CLI", () => {
  for (const name of [
    "defineSite",
    "validateNavigation",
    "loadSite",
    "syncSite",
    "checkSite",
    "checkContent",
    "validateSite",
    "imageDimensions",
    "mintVersion",
    "siteDefaults",
  ])
    assert(name in kit, name);
  assert.equal(kit.syncSite, syncSite);
  // 0.1.x consumers deep-imported bin; the re-export keeps them working.
  assert.equal(legacySyncSite, syncSite);
});

test("generated files survive packaging, detect drift and leave app content intact", async () => {
  const dir = await fixture({
    "site.json": base,
    "guide.mdx": "Product-owned content",
  });
  try {
    const config = join(dir, "site.json");
    await syncSite({ config, dir });
    await syncSite({ config, dir, check: true });
    await checkSite({ config, dir });
    const goldCss = await readFile(join(dir, "oss-docs.css"), "utf8");
    assert.match(goldCss, /--oss-primary: #a16207/u);
    const header = await readFile(join(dir, "oss-docs.js"), "utf8");
    assert(header.includes(JSON.stringify(base.name)));
    const manifest = JSON.parse(
      await readFile(join(dir, ".oss-docs.json"), "utf8"),
    );
    assert.equal(manifest.package, "@avgeek-oss/mintlify-docs");
    assert.equal(
      await readFile(join(dir, "guide.mdx"), "utf8"),
      "Product-owned content",
    );
    await writeFile(join(dir, "oss-docs.css"), "manual edit");
    await assert.rejects(
      syncSite({ config, dir, check: true }),
      /oss-docs.css/,
    );
    await assert.rejects(checkSite({ config, dir }), (error) => {
      assert.deepEqual(error.problems, [
        "Generated documentation differs: oss-docs.css; run docs:sync",
      ]);
      return true;
    });
    await syncSite({ config, dir });
    await syncSite({ config, dir, check: true });
    await writeFile(
      config,
      JSON.stringify({
        ...base,
        colors: { primary: "#77520A", light: "#E0B84A", dark: "#77520A" },
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

test("assets are copied on sync, compared byte for byte and removed when dropped", async () => {
  const mark = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 1, 2, 255]);
  const dir = await fixture({
    "brand/mark.png": mark,
    "brand/social.png": "social",
    "docs/site.json": {
      ...base,
      assets: [
        { from: "../brand/mark.png", to: "assets/mark.png" },
        { from: "../brand/social.png", to: "/assets/social.png" },
      ],
    },
  });
  try {
    const config = join(dir, "docs/site.json");
    const docs = join(dir, "docs");
    const files = await syncSite({ config, dir: docs });
    assert(files.includes("assets/mark.png"));
    assert.deepEqual(await readFile(join(docs, "assets/mark.png")), mark);
    assert.equal(
      await readFile(join(docs, "assets/social.png"), "utf8"),
      "social",
    );
    const manifest = JSON.parse(
      await readFile(join(docs, ".oss-docs.json"), "utf8"),
    );
    assert.match(manifest.files["assets/mark.png"], /^[a-f\d]{64}$/);
    await checkSite({ config, dir: docs });

    await writeFile(join(dir, "brand/mark.png"), "new brand");
    await assert.rejects(
      checkSite({ config, dir: docs }),
      /differs: assets\/mark\.png, \.oss-docs\.json/,
    );
    await syncSite({ config, dir: docs });
    await writeFile(join(docs, "assets/social.png"), "edited copy");
    await assert.rejects(
      checkSite({ config, dir: docs }),
      /assets\/social\.png/,
    );

    // Dropping an asset deletes the copy sync made, and check reports it first.
    await writeFile(
      config,
      JSON.stringify({
        ...base,
        assets: [{ from: "../brand/mark.png", to: "assets/mark.png" }],
      }),
    );
    await assert.rejects(
      checkSite({ config, dir: docs }),
      /No longer generated: assets\/social\.png/,
    );
    await syncSite({ config, dir: docs });
    assert.equal(await exists(join(docs, "assets/social.png")), false);
    assert.equal(await exists(join(docs, "assets/mark.png")), true);
    await checkSite({ config, dir: docs });

    for (const [assets, message] of [
      [
        [{ from: "../brand/missing.png", to: "assets/x.png" }],
        /Missing asset source/,
      ],
      [
        [{ from: "../brand/mark.png", to: "../outside.png" }],
        /inside the content directory/,
      ],
      [[{ from: "../brand/mark.png", to: "docs.json" }], /generated file/],
      [
        [{ from: "../brand/mark.png", to: "snippets/oss/x.jsx" }],
        /generated file/,
      ],
      [[{ from: "../brand/mark.png" }], /must be a non-empty path/],
      [
        [{ from: "../brand/mark.png", to: "a.png", mode: 1 }],
        /exactly \{ from, to \}/,
      ],
      [
        [
          { from: "../brand/mark.png", to: "a.png" },
          { from: "../brand/social.png", to: "a.png" },
        ],
        /Duplicate asset target/,
      ],
      ["assets/mark.png", /list of \{ from, to \}/],
    ]) {
      await writeFile(config, JSON.stringify({ ...base, assets }));
      await assert.rejects(syncSite({ config, dir: docs }), message);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("navigation includes merge generated lists without rewriting site.json", async () => {
  const site = {
    ...base,
    navigation: {
      dropdowns: [
        {
          dropdown: "Guide",
          groups: [{ group: "Start", pages: ["guide"] }],
        },
        {
          dropdown: "API",
          groups: [
            { group: "API reference", pages: { $include: "api.json" } },
            {
              group: "MCP reference",
              pages: [
                "mcp-reference/overview",
                { $include: "generated/reference.json#/mcp" },
              ],
            },
          ],
        },
      ],
    },
  };
  const dir = await fixture({
    "site.json": site,
    "api.json": [
      "api-reference/overview",
      { group: "Tasks", pages: ["api-reference/list_tasks"] },
    ],
    // Nested includes resolve relative to the file that contains them.
    "generated/reference.json": {
      mcp: [{ group: "Tools", pages: [{ $include: "tools.json" }] }],
    },
    "generated/tools.json": ["mcp-reference/list_tasks"],
  });
  try {
    const config = join(dir, "site.json");
    const before = await readFile(config, "utf8");
    const { site: resolved } = await loadSite(config);
    assert.deepEqual(resolved.navigation.dropdowns[1].groups, [
      {
        group: "API reference",
        pages: [
          "api-reference/overview",
          { group: "Tasks", pages: ["api-reference/list_tasks"] },
        ],
      },
      {
        group: "MCP reference",
        pages: [
          "mcp-reference/overview",
          { group: "Tools", pages: ["mcp-reference/list_tasks"] },
        ],
      },
    ]);
    await syncSite({ config, dir });
    assert.equal(await readFile(config, "utf8"), before);
    const docs = JSON.parse(await readFile(join(dir, "docs.json"), "utf8"));
    assert.deepEqual(docs.navigation, resolved.navigation);

    // A regenerated include is drift until the next sync.
    await writeFile(
      join(dir, "generated/tools.json"),
      JSON.stringify(["mcp-reference/list_tasks", "mcp-reference/get_task"]),
    );
    await assert.rejects(checkSite({ config, dir }), /docs\.json/);
    await syncSite({ config, dir });
    await checkSite({ config, dir });

    // Included pages join the duplicate check.
    await writeFile(
      join(dir, "generated/tools.json"),
      JSON.stringify(["guide"]),
    );
    await assert.rejects(loadSite(config), /Duplicate navigation page: guide/);

    for (const [include, files, message] of [
      ["missing.json", {}, /Missing navigation include/],
      ["object.json", { "object.json": { pages: [] } }, /must be an array/],
      ["generated/reference.json#/api", {}, /does not exist/],
      ["pages.txt", {}, /relative \.json file/],
      ["loop.json", { "loop.json": [{ $include: "loop.json" }] }, /cycle/],
    ]) {
      for (const [name, value] of Object.entries(files))
        await writeFile(join(dir, name), JSON.stringify(value));
      site.navigation.dropdowns[1].groups[0].pages = { $include: include };
      await writeFile(config, JSON.stringify(site));
      await assert.rejects(loadSite(config), message, include);
    }
    site.navigation.dropdowns[1].groups[0].pages = {
      $include: "api.json",
      extra: true,
    };
    await writeFile(config, JSON.stringify(site));
    await assert.rejects(loadSite(config), /exactly/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("{version} comes from the nearest package.json or the configured one", async () => {
  const versioned = {
    ...base,
    footer: {
      ...base.footer,
      links: [
        {
          header: "Documentation",
          items: [{ label: "Install v{version}", href: "/guide" }],
        },
      ],
    },
    banner: { content: "Version {version} and {version}" },
  };
  const dir = await fixture({
    "package.json": { name: "product", version: "2.3.4" },
    "docs/package.json": { name: "product-docs", private: true },
    "docs/nested/site.json": versioned,
    "app/package.json": { name: "other", version: "9.9.9" },
  });
  try {
    const config = join(dir, "docs/nested/site.json");
    // The nearest package.json has no version: say so instead of guessing.
    await assert.rejects(
      loadSite(config),
      /docs\/package\.json has no version/,
    );
    await writeFile(
      join(dir, "docs/package.json"),
      JSON.stringify({ name: "product-docs", version: "1.0.0" }),
    );
    let { site } = await loadSite(config);
    assert.equal(site.footer.links[0].items[0].label, "Install v1.0.0");
    assert.equal(site.banner.content, "Version 1.0.0 and 1.0.0");
    await writeFile(
      config,
      JSON.stringify({ ...versioned, packageJson: "../../package.json" }),
    );
    ({ site } = await loadSite(config));
    assert.equal(site.footer.links[0].items[0].label, "Install v2.3.4");
    assert.equal("packageJson" in site, false);

    // Without {version}, no package.json is read at all.
    await writeFile(
      config,
      JSON.stringify({ ...base, packageJson: "../../missing.json" }),
    );
    await loadSite(config);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("the footer repository label is configured from footer.socials.github", async () => {
  const dir = await fixture({});
  try {
    const config = join(dir, "site.json");
    const settings = async (socials) => {
      await writeFile(
        config,
        JSON.stringify({ ...base, footer: { ...base.footer, socials } }),
      );
      await syncSite({ config, dir });
      const script = await readFile(join(dir, "oss-docs.js"), "utf8");
      return script.match(/const settings = (\{[\s\S]*?\});/)[1];
    };
    assert.match(
      await settings({ github: "https://github.com/avgeek-oss/oss-docs/" }),
      /repository: \{\s*href: "https:\/\/github\.com\/avgeek-oss\/oss-docs",\s*label: "avgeek-oss\/oss-docs",?\s*\}/,
    );
    assert.match(
      await settings({ github: "https://github.com/avgeek-oss" }),
      /repository: null/,
    );
    assert.match(await settings({}), /repository: null/);
    await assert.rejects(
      settings({ github: "github.com/avgeek-oss/oss-docs" }),
      /footer\.socials\.github must be an absolute URL/,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("SEO retains per-page metadata defaults and validates the canonical origin", () => {
  const config = defineSite({
    ...base,
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
        ...base,
        seo: { metatags: { canonical: "https://docs.example.test/guide" } },
      }),
    /origin/,
  );
});
