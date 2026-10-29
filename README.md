# Avgeek OSS Mintlify Docs

Shared Mintlify homepage layouts, documentation primitives, and site tooling for Avgeek OSS projects. Product repositories own their content, branding, navigation destinations, screenshots, API schemas, analytics, and legal pages.

Mintlify custom components cannot import external npm packages. This kit installs as a development tool and generates local JSX snippets, CSS, JavaScript, and `docs.json` for Mintlify to serve directly. Commit those generated files. CI checks them against the exact installed kit so edits cannot silently drift.

## Install and use

Use Node.js 24 and pnpm 11. The package is public on npmjs.org and requires no registry credentials.

```bash
pnpm add -Dw @avgeek-oss/mintlify-docs@0.1.6
```

When migrating from `@avgeek-oss/docs`, remove that dependency, add `@avgeek-oss/mintlify-docs`, and update scripts to use the `mintlify-docs` CLI. Change any `@avgeek-oss` registry mapping to `https://registry.npmjs.org` and refresh the lockfile. Generated filenames and snippet import paths stay the same. Run `docs:sync` to update their package metadata.

Create a product-owned `docs/site.json`. It needs `name`, `colors` (`primary`, `light` and `dark`), `navigation`, a `navbar.primary` CTA and `footer.links`; [Navigation and site configuration](docs/navigation.md) describes each. All additional native Mintlify options are preserved.

```json
{
  "scripts": {
    "docs:sync": "mintlify-docs sync --config docs/site.json --dir docs",
    "docs:check": "mintlify-docs check --config docs/site.json --dir docs --content",
    "docs:validate": "mintlify-docs validate --dir docs"
  }
}
```

Run `pnpm docs:sync`, commit its output, and run `pnpm docs:check` and `pnpm docs:validate` in CI. Repeat after upgrading the pinned kit. Sync only writes its declared generated files and the `assets` copies listed in `site.json`; it leaves product pages and local styles untouched. `--content` also checks navigation pages, MDX, frontmatter, routes, redirects, internal links, anchors and screenshot sizes. `validate` runs Mintlify's validation, broken-link and accessibility checks with the CLI version the kit pins. See [Site tooling](docs/tooling.md) for assets, navigation includes, `{version}` and the content checks.

Scripts can import `syncSite`, `checkSite`, `checkContent`, `loadSite` and `validateSite` from `@avgeek-oss/mintlify-docs`; nothing needs a path inside the package.

Import snippets directly into the parent MDX page:

```mdx
import { Home, Hero, Actions, ActionLink } from "/snippets/oss/homepage.jsx";

<Home>
  <Hero id="hero-heading">
    <h1 id="hero-heading">Your project</h1>
    <p>Explain what it helps people do.</p>
    <Actions>
      <ActionLink href="/docs/getting-started">Get started →</ActionLink>
    </Actions>
  </Hero>
</Home>
```

Set `mode: "custom"` in homepage frontmatter. Import all snippet dependencies in the page; Mintlify does not support cross-snippet imports.

## Guides

- [Homepage and screenshots](docs/components.md): exported components, slots, heading structure, responsive images, and themes.
- [Navigation and site configuration](docs/navigation.md): categories, grouped page lists, header/footer links, and generated-file ownership.
- [Site tooling](docs/tooling.md): sync, drift and content checks, pinned Mintlify validation, assets, navigation includes, `{version}`, and the package API.
- [Writing documentation](docs/authoring.md): task guides, reference pages, native Mintlify components, examples, screenshots, and verification.
- [Contributing](CONTRIBUTING.md): local checks, preview, package contracts, and releases.

## Develop

```bash
pnpm install --frozen-lockfile
pnpm verify
pnpm dev
```

`pnpm dev` writes the test fixture site into `.preview/` (not committed), syncs it and serves it at `http://localhost:4176`. CI also validates the fixture's generated output with Mintlify's pinned CLI (`pnpm validate:fixture`). Package verification installs the tarball into a fresh temporary project and runs both generation and drift checking outside this checkout.

Releases use `v<package version>` tags on `main`. CI verifies the package first, then publishes the same tarball publicly to npmjs.org using GitHub Actions OIDC. No publishing runs on pull requests or ordinary branch pushes. Configure `avgeek-oss/oss-docs` with workflow `ci.yml` as the package's npm trusted publisher. The initial npm package is created interactively from its tagged release's verified artifact; subsequent releases need no stored publishing token. Existing GitHub Packages versions remain available for old checkouts.

Licensed under Apache-2.0. The initial layout is extracted from [Towbar](https://github.com/avgeek-oss/towbar).
