# Site tooling

The `mintlify-docs` CLI generates the shared files from `site.json`, checks them and the published content, and runs Mintlify's own validation with one pinned version. Product repositories call the CLI or the package API instead of keeping their own build and check scripts.

```json
{
  "scripts": {
    "docs:sync": "mintlify-docs sync --config docs/site.json --dir docs",
    "docs:check": "mintlify-docs check --config docs/site.json --dir docs --content",
    "docs:validate": "mintlify-docs validate --dir docs"
  }
}
```

| Command                                            | What it does                                                                                                                               |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `sync --config <site.json> --dir <dir>`            | Writes the generated files and copies assets. Removes files an earlier sync generated that the configuration dropped.                      |
| `check --config <site.json> --dir <dir>`           | Compares every generated file and asset byte for byte. Fails on drift or on files that are no longer generated.                            |
| `check --config <site.json> --dir <dir> --content` | Also checks the pages, links, redirects, CSS, screenshots and repository Markdown described below.                                         |
| `validate --dir <dir>`                             | Runs `mint validate`, `mint broken-links --check-anchors --check-redirects --check-snippets` and `mint a11y` with the pinned Mintlify CLI. |

Each command exits nonzero on failure. Checks list every problem as `file:line: message` before exiting, not only the first. `validate` downloads the pinned `mint` package with `npx`, so it needs network access; run it in CI after `docs:check`.

## Tooling keys in site.json

These keys configure the tooling and are removed from the generated `docs.json`. Paths are relative to `site.json` unless stated otherwise.

```json
{
  "assets": [
    { "from": "../apps/web/public/brand/mark.png", "to": "assets/mark.png" }
  ],
  "packageJson": "../package.json",
  "content": {
    "standalone": ["privacy", "terms"],
    "screenshots": "screenshots.json",
    "markdown": [".."],
    "exclude": ["design/"]
  }
}
```

### Assets

`assets` lists files to copy into the content directory: `from` is relative to `site.json`, `to` is relative to `--dir`. Sync copies each file unchanged and records its hash in `.oss-docs.json`; check compares the copy byte for byte with its source. Use it for brand marks, favicons, published schemas and example files that live elsewhere in the repository. A target cannot leave the content directory or replace a generated file. Commit the copies like the other generated files and do not edit them.

### Navigation includes

A group's `pages` (or a `groups` list) can be `{ "$include": "<file>.json" }`. Sync reads the JSON array from that file and writes the merged navigation to `docs.json`; `site.json` stays as written. As an item inside a list, the include's entries are spliced in place, so a hand-owned overview page can precede generated pages:

```json
{
  "group": "API reference",
  "pages": [
    "api-reference/overview",
    { "$include": "reference-navigation.json#/api" }
  ]
}
```

The optional `#/pointer` selects part of the file with a JSON pointer, so one generated file can feed several groups. Include paths are relative to the file that contains them, and included files can include others. Included pages take part in the duplicate-page check. A generator that writes the include file only needs to run before `docs:sync`; `docs:check` reports the regenerated navigation as `docs.json` drift until sync runs.

### Version

Sync replaces `{version}` in any `site.json` string with the `version` of a package.json: the one `packageJson` names, otherwise the nearest one at or above the directory of `site.json`. It fails if that file has no version. A `site.json` without `{version}` never reads a package.json.

### Footer repository label

When `footer.socials.github` is a `https://github.com/<owner>/<repository>` URL, the generated `oss-docs.js` shows `<owner>/<repository>` beside the native GitHub icon in the footer. Other GitHub links are left unchanged. Remove product copies of this footer script and its styles; the shared stylesheet owns them.

## Content checks

`check --content` reads the content directory as Mintlify publishes it: files matched by `.mintignore` (gitignore syntax), dot files and `node_modules` are not published, and files under `snippets/` are imported, not pages. It checks:

- **Navigation:** every navigation page has an `.mdx` or `.md` file that `.mintignore` does not exclude; no two navigation entries publish the same route (for example `guide` and `guide/index`). OpenAPI operations such as `GET /tasks` are skipped.
- **Pages:** every page and MDX snippet compiles with `@mdx-js/mdx`; every page has a frontmatter `title` and `description`; no two files publish the same route.
- **Orphans:** every page is in navigation, is the homepage `index`, or is listed in `content.standalone`. A redirect whose source is an existing page is reported, because the page can never be reached.
- **Redirects:** sources are unique; destinations resolve; chains end without a cycle. Sources with path parameters such as `/blog/:slug*` match any internal link under them.
- **Links:** internal Markdown links, images and reference definitions; `href`, `src`, `light`, `dark` and path-valued `icon` attributes; path-valued `icon:` frontmatter; `url()` in published CSS; and `href`, `destination`, `favicon`, `light`, `dark` and `icon` paths in `docs.json`. Links resolve through redirects to a page or a published file. An anchor must match a heading slug or an `id` on the target page. `<url>` brackets, link titles and query strings are removed and `%xx` escapes decoded before resolving. Code blocks, inline code and comments are ignored.
- **Screenshots:** with `content.screenshots`, every listed image is published and has the expected pixel size.
- **Repository Markdown:** with `content.markdown`, Markdown and MDX files under those directories outside the published pages have their relative links checked on disk. `node_modules`, dot directories, `dist`, `tmp`, `artifacts`, `playwright-report` and `test-results*` are skipped, as are paths matching `content.exclude`.

The screenshot manifest lists each image's site path and its size in CSS pixels, with an optional device `scale` (default 1). `dark` is optional for images without a dark variant. PNG, JPEG and SVG sizes are read from the file header.

```json
{
  "screenshots": [
    {
      "light": "/assets/screenshots/composer-light.png",
      "dark": "/assets/screenshots/composer-dark.png",
      "width": 1280,
      "height": 900,
      "scale": 2
    }
  ]
}
```

Generate the manifest from the capture script that produces the screenshots, and list it in `.mintignore` so Mintlify does not publish it. Product-specific contracts, such as OpenAPI coverage or installation-file copies, stay in product checks.

## Package API

Import from the package root; `bin/` is only the CLI.

```js
import {
  syncSite,
  checkSite,
  checkContent,
  loadSite,
  validateSite,
} from "@avgeek-oss/mintlify-docs";

await syncSite({ config: "docs/site.json", dir: "docs" });
await checkSite({ config: "docs/site.json", dir: "docs", content: true });
```

`checkSite` throws a `SiteCheckError` whose `problems` lists every failure. `checkContent` returns `{ problems, pages, links, images }` without throwing for content problems. `loadSite` returns the `docs.json` configuration with includes and `{version}` resolved, plus the parsed `assets` and `content` options. Invalid configuration throws in every function.
