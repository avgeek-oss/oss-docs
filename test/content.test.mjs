import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { checkContent, checkSite, imageDimensions } from "../src/index.mjs";
import { createIgnore } from "../src/ignore.mjs";

const png = (width, height) => {
  const header = Buffer.alloc(24);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(header);
  header.writeUInt32BE(13, 8);
  header.write("IHDR", 12, "ascii");
  header.writeUInt32BE(width, 16);
  header.writeUInt32BE(height, 20);
  return header;
};
const jpeg = (width, height) => {
  const image = Buffer.alloc(32);
  // SOI, an APP0 segment to skip, then a baseline frame header.
  Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0, 0, 0xff, 0xc0]).copy(
    image,
  );
  image.writeUInt16BE(17, 10);
  image[12] = 8;
  image.writeUInt16BE(height, 13);
  image.writeUInt16BE(width, 15);
  return image;
};

const site = {
  name: "Example",
  colors: { primary: "#A16207", light: "#B08505", dark: "#B9872C" },
  logo: { light: "/assets/logo.svg", dark: "/assets/logo-missing.svg" },
  navigation: {
    dropdowns: [
      {
        dropdown: "Guide",
        groups: [
          {
            group: "Start",
            pages: [
              "guide",
              "reference",
              "broken",
              "untitled",
              "invalid",
              "dup",
              "section",
              "section/index",
              "missing-page",
              "private/notes",
            ],
          },
        ],
      },
    ],
  },
  navbar: { primary: { href: "/guide" } },
  footer: {
    links: [
      {
        header: "Docs",
        items: [
          { label: "Guide", href: "/guide#setup" },
          { label: "Missing", href: "/footer-missing" },
        ],
      },
    ],
  },
  redirects: [
    { source: "/old", destination: "/guide" },
    { source: "/moved", destination: "/guide#setup" },
    { source: "/loop-a", destination: "/loop-b" },
    { source: "/loop-b", destination: "/loop-a" },
    { source: "/dupe", destination: "/guide" },
    { source: "/dupe", destination: "/reference" },
    { source: "/gone", destination: "/nowhere" },
    { source: "/blog/:slug*", destination: "/guide" },
    { source: "/legal", destination: "https://example.test/legal" },
  ],
  content: {
    standalone: ["privacy", "ghost"],
    screenshots: "screenshots.json",
    markdown: [".."],
    exclude: ["design/"],
  },
};

const page = (title, body) =>
  `---\ntitle: "${title}"\ndescription: "About ${title}."\n---\n\n${body}\n`;

const files = {
  "docs/site.json": JSON.stringify(site),
  "docs/.mintignore": "# Not published\nprivate/\nnotes/\nscreenshots.json\n",
  "docs/screenshots.json": JSON.stringify({
    screenshots: [
      {
        light: "/assets/shot.png",
        dark: "assets/shot-dark.png",
        width: 1280,
        height: 800,
        scale: 2,
      },
      { light: "/assets/photo.jpg", width: 100, height: 100 },
      { light: "/assets/missing.png", width: 10, height: 10 },
      { light: "/assets/logo.svg", width: 40, height: 40 },
      { light: "/assets/shot.png", width: 2560, height: 1600 },
      { light: "/assets/photo.jpg" },
    ],
  }),
  "docs/index.mdx": page("Home", "Welcome. [Start](/guide)."),
  "docs/guide.mdx": `---
title: "Guide"
description: 'It''s complete.'
icon: "/assets/logo.svg"
---

## \`towbar upgrade\`

## Setup

## Setup

<div id="custom-anchor" />

[ok](/reference) [inline code anchor](/guide#towbar-upgrade) [repeated](/guide#setup-1)
[id](/guide#custom-anchor) [same page](#anything) [query](/reference?tab=1#details)
[spaces](</assets/my file.png> "Title") [encoded](/assets/my%20file.png) [titled](/reference 'Title')
![image](/assets/shot.png) [relative](reference) [redirected](/old#setup) [index](/)
[through redirect](/moved) [wildcard](/blog/post) [external redirect](/legal)

<Card title="Reference" href="/reference" icon="book-open" />
<img src="/assets/shot.png" alt="Shot" />
<Frame light="/assets/shot.png" dark="/assets/shot-dark.png" />
<Card title="Expression" href={"/" + "nope"} />

[web](https://example.test) [mail](mailto:team@example.test) [protocol](//cdn.example.test/x.js)

\`\`\`md
[inside a fence](/nope)
\`\`\`

\`[inline code](/nope)\`

{/* [comment](/nope) */}

[ref]: /reference
`,
  "docs/reference.mdx": page("Reference", "## Details\n\nReference."),
  "docs/broken.mdx": `---
title: "Broken"
description: "Every kind of broken link."
icon: "/assets/missing-icon.svg"
---

[missing](/nope)
[anchor](/reference#nowhere)
<a href="/also-missing">Also</a>
<img src="/assets/missing.png" alt="" />
<Frame light="/assets/light-missing.png" dark="/assets/dark-missing.png" />
<Card icon="/assets/missing-card.svg" />
[malformed](/bad%zz)
[outside](../../outside)
[unpublished](/private/notes)
[loop](/loop-a)
[ref]: /missing-reference
`,
  "docs/untitled.mdx": "No frontmatter here.\n",
  "docs/invalid.mdx": page("Invalid", "Line one.\n\n<Card>\n\nNever closed."),
  "docs/dup.md": page("Markdown", "Plain Markdown."),
  "docs/dup.mdx": page("MDX", "Same route."),
  "docs/section.mdx": page("Section", "Section."),
  "docs/section/index.mdx": page("Section index", "Also /section."),
  "docs/orphan.mdx": page("Orphan", "Not listed."),
  "docs/privacy.mdx": page("Privacy", "Standalone."),
  "docs/old.mdx": page("Old", "Shadowed by a redirect."),
  "docs/private/notes.mdx": page("Notes", "Unpublished."),
  "docs/notes/draft.md": "[guide](/guide) [missing](/draft-missing)\n",
  "docs/snippets/note.mdx": "Shared [snippet link](/snippet-missing).\n",
  "docs/styles.css": `/* url("/in-comment.png") */
.a { background: url("/assets/shot.png"); }
.b { background: url(/assets/missing-bg.png); }
.c { background: url(data:image/png;base64,AAAA); }
.d { src: url('fonts/missing.woff2'); }
.e { background: url(assets/shot.png); }
`,
  "docs/assets/shot.png": png(2560, 1600),
  "docs/assets/shot-dark.png": png(2560, 1600),
  "docs/assets/photo.jpg": jpeg(120, 90),
  "docs/assets/my file.png": png(1, 1),
  "docs/assets/logo.svg":
    '<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"></svg>',
  "README.md":
    "[guide](docs/guide.mdx) [route](./docs/guide) [missing](missing.md) [dir](docs)\n<!-- [hidden](missing-in-comment.md) -->\n[root](/docs/reference.mdx) [web](https://example.test)\n",
  "packages/app/README.md": "[up](../../README.md) [broken](../nope.md)\n",
  "node_modules/dep/README.md": "[ignored](nope.md)\n",
  "test-results-1/README.md": "[ignored](nope.md)\n",
  "design/README.md": "[excluded](nope.md)\n",
};

async function fixture(entries) {
  const dir = await mkdtemp(join(tmpdir(), "oss-docs-content-"));
  for (const [name, content] of Object.entries(entries)) {
    await mkdir(dirname(join(dir, name)), { recursive: true });
    await writeFile(join(dir, name), content);
  }
  return dir;
}

test("check --content reports every problem across pages, config, CSS, screenshots and Markdown", async () => {
  const dir = await fixture(files);
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    const { problems, pages, images } = await checkContent({
      config: "docs/site.json",
      dir: "docs",
    });
    const expected = [
      // Routes and navigation.
      /^docs\/dup\.mdx: publishes \/dup, as dup\.md does$/,
      /^docs\/section\.mdx: publishes \/section, as section\/index\.mdx does$/,
      /^docs\/site\.json navigation: section\/index and section are both \/section$/,
      /^docs\/site\.json navigation: missing-page has no missing-page\.mdx page$/,
      /^docs\/site\.json navigation: private\/notes is excluded by \.mintignore$/,
      /^docs\/site\.json content\.standalone: ghost has no page file$/,
      /^docs\/orphan\.mdx: \/orphan is not in navigation/,
      /^docs\/old\.mdx: \/old is not in navigation/,
      // Redirects.
      /^docs\/site\.json redirects\[0\]: \/old shadows docs\/old\.mdx/,
      /^docs\/site\.json redirects\[5\]: duplicate redirect source \/dupe$/,
      /^docs\/site\.json redirects\[6\]\.destination: \/nowhere does not exist$/,
      /^docs\/site\.json redirects\[2\]\.destination: \/loop-b ends in a redirect cycle$/,
      /^docs\/site\.json redirects\[3\]\.destination: \/loop-a ends in a redirect cycle$/,
      // Frontmatter and MDX.
      /^docs\/untitled\.mdx:1: frontmatter needs a title$/,
      /^docs\/untitled\.mdx:1: frontmatter needs a description$/,
      /^docs\/invalid\.mdx:8:1: does not compile as MDX: Expected a closing tag for `<Card>`/,
      // Links, attributes and frontmatter icons.
      /^docs\/broken\.mdx:4: \/assets\/missing-icon\.svg does not exist$/,
      /^docs\/broken\.mdx:7: \/nope does not exist$/,
      /^docs\/broken\.mdx:8: \/reference#nowhere has no #nowhere heading or id on \/reference$/,
      /^docs\/broken\.mdx:9: \/also-missing does not exist$/,
      /^docs\/broken\.mdx:10: \/assets\/missing\.png does not exist$/,
      /^docs\/broken\.mdx:11: \/assets\/light-missing\.png does not exist$/,
      /^docs\/broken\.mdx:11: \/assets\/dark-missing\.png does not exist$/,
      /^docs\/broken\.mdx:12: \/assets\/missing-card\.svg does not exist$/,
      /^docs\/broken\.mdx:13: \/bad%zz has malformed percent-encoding$/,
      /^docs\/broken\.mdx:14: \.\.\/\.\.\/outside points outside the documentation$/,
      /^docs\/broken\.mdx:15: \/private\/notes is excluded by \.mintignore$/,
      /^docs\/broken\.mdx:16: \/loop-a ends in a redirect cycle$/,
      /^docs\/broken\.mdx:17: \/missing-reference does not exist$/,
      /^docs\/snippets\/note\.mdx:1: \/snippet-missing does not exist$/,
      // docs.json links.
      /^docs\/site\.json logo\.dark: \/assets\/logo-missing\.svg does not exist$/,
      /^docs\/site\.json footer\.links\[0\]\.items\[1\]\.href: \/footer-missing does not exist$/,
      // CSS.
      /^docs\/styles\.css:3: \/assets\/missing-bg\.png does not exist$/,
      /^docs\/styles\.css:5: fonts\/missing\.woff2 does not exist$/,
      // Screenshots.
      /^docs\/screenshots\.json screenshots\[1\]\.light: \/assets\/photo\.jpg is 120x90, expected 100x100$/,
      /^docs\/screenshots\.json screenshots\[2\]\.light: \/assets\/missing\.png does not exist$/,
      /^docs\/screenshots\.json screenshots\[4\]\.light: assets\/shot\.png is listed twice$/,
      /^docs\/screenshots\.json screenshots\[5\]: needs light/,
      // Repository Markdown.
      /^docs\/notes\/draft\.md:1: \/draft-missing does not exist$/,
      /^README\.md:1: missing\.md does not exist$/,
      /^packages\/app\/README\.md:1: \.\.\/nope\.md does not exist$/,
    ];
    for (const pattern of expected)
      assert(
        problems.some((problem) => pattern.test(problem)),
        `${pattern} not in:\n${problems.join("\n")}`,
      );
    assert.equal(
      problems.length,
      expected.length,
      `Unexpected problems:\n${problems
        .filter((problem) => !expected.some((pattern) => pattern.test(problem)))
        .join("\n")}`,
    );
    assert.equal(pages, 13);
    assert.equal(images, 5);
  } finally {
    process.chdir(cwd);
    await rm(dir, { recursive: true, force: true });
  }
});

test("a clean site passes the drift and content checks together", async () => {
  const clean = {
    ...site,
    logo: { light: "/assets/logo.svg", dark: "/assets/logo.svg" },
    navigation: {
      dropdowns: [
        {
          dropdown: "Guide",
          groups: [
            { group: "Start", pages: ["guide", "reference"] },
            // OpenAPI operations have no page file of their own.
            { group: "API", pages: ["POST /tasks", "openapi.json GET /tasks"] },
          ],
        },
      ],
    },
    footer: {
      links: [{ header: "Docs", items: [{ label: "Guide", href: "/guide" }] }],
    },
    redirects: [{ source: "/old", destination: "/reference#details" }],
    content: { screenshots: "screenshots.json" },
  };
  const dir = await fixture({
    "site.json": JSON.stringify(clean),
    ".mintignore": "screenshots.json\n",
    "screenshots.json": JSON.stringify({
      screenshots: [
        { light: "/assets/shot.png", width: 1280, height: 800, scale: 2 },
      ],
    }),
    "index.mdx": page("Home", "[Guide](/guide)"),
    "guide.mdx": page("Guide", "[Old](/old) ![Shot](/assets/shot.png)"),
    "reference.mdx": page("Reference", "## Details"),
    "assets/shot.png": png(2560, 1600),
    "assets/logo.svg": '<svg width="40" height="40"></svg>',
  });
  try {
    const { syncSite } = await import("../src/index.mjs");
    const config = join(dir, "site.json");
    await syncSite({ config, dir });
    const result = await checkSite({ config, dir, content: true });
    assert.equal(result.pages, 3);
    assert.equal(result.images, 1);
    await writeFile(join(dir, "guide.mdx"), page("Guide", "[Gone](/gone)"));
    await writeFile(join(dir, "oss-docs.css"), "edited");
    await assert.rejects(checkSite({ config, dir, content: true }), (error) => {
      assert.equal(error.problems.length, 2);
      assert.match(error.problems[0], /differs: oss-docs\.css/);
      assert.match(error.problems[1], /guide\.mdx:6: \/gone does not exist/);
      return true;
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("content options are validated before checking", async () => {
  const dir = await fixture({});
  try {
    const config = join(dir, "site.json");
    for (const [content, message] of [
      [{ orphans: [] }, /Unknown content option: orphans/],
      [{ standalone: "privacy" }, /content\.standalone must be a list/],
      [{ screenshots: 1 }, /content\.screenshots must be a path/],
      [[], /content must be an object/],
    ]) {
      await writeFile(config, JSON.stringify({ ...site, content }));
      await assert.rejects(checkContent({ config, dir }), message);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("image dimensions come from PNG, JPEG and SVG headers", () => {
  assert.deepEqual(imageDimensions(png(2560, 1600)), {
    format: "png",
    width: 2560,
    height: 1600,
  });
  assert.deepEqual(imageDimensions(jpeg(640, 480)), {
    format: "jpeg",
    width: 640,
    height: 480,
  });
  assert.deepEqual(
    imageDimensions(
      Buffer.from('<svg width="1200px" height="700" viewBox="0 0 1 1">'),
    ),
    { format: "svg", width: 1200, height: 700 },
  );
  assert.deepEqual(
    imageDimensions(Buffer.from('<!-- a -->\n<svg viewBox="0,0,40,30">')),
    { format: "svg", width: 40, height: 30 },
  );
  assert.throws(() => imageDimensions(Buffer.from("GIF89a")), /unsupported/);
  assert.throws(() => imageDimensions(Buffer.from([0xff, 0xd8, 0, 0])), /JPEG/);
  assert.throws(() => imageDimensions(Buffer.from("<svg>")), /no width/);
});

test(".mintignore patterns follow gitignore rules", () => {
  const ignores = createIgnore([
    "# comment",
    "**/*.md",
    "!keep/README.md",
    "assets/**/README.md",
    "/*-report.json",
    "contributors/",
    "home.mdx",
  ]);
  assert(ignores("guide.md"));
  assert(ignores("a/b/guide.md"));
  assert.equal(ignores("keep/README.md"), false);
  assert(ignores("assets/README.md"));
  assert(ignores("summary-report.json"));
  assert.equal(ignores("nested/summary-report.json"), false);
  assert(ignores("contributors/guide.mdx"));
  assert(ignores("a/contributors/guide.mdx"));
  assert.equal(ignores("contributors"), false);
  assert(ignores("contributors", true));
  assert(ignores("home.mdx"));
  assert(ignores("nested/home.mdx"));
  assert.equal(ignores("guide.mdx"), false);
  assert.equal(createIgnore([])("guide.md"), false);
});

test("the example's generated docs.json resolves its include and version", async () => {
  const docs = JSON.parse(
    await readFile(
      new URL("../examples/site/docs.json", import.meta.url),
      "utf8",
    ),
  );
  assert.deepEqual(docs.navigation.dropdowns[0].groups[1], {
    group: "Reference",
    pages: ["reference"],
  });
  assert.equal(docs.footer.links[0].items[0].label, "Get started with v1.0.0");
  assert.equal("assets" in docs || "content" in docs, false);
});
