# Avgeek OSS Mintlify Docs

Shared Mintlify homepage layouts, documentation primitives, and site tooling for Avgeek OSS projects. Product repositories own their content, branding, navigation destinations, screenshots, API schemas, analytics, and legal pages.

Mintlify custom components cannot import external npm packages. This kit installs as a development tool and generates local JSX snippets, CSS, JavaScript, and `docs.json` for Mintlify to serve directly. Commit those generated files. CI checks them against the exact installed kit so edits cannot silently drift.

## Install and use

Use Node.js 24 and pnpm 11. The package is public on npmjs.org and requires no registry credentials.

```bash
pnpm add -Dw @avgeek-oss/mintlify-docs@0.1.6
```

When migrating from `@avgeek-oss/docs`, remove that dependency, add `@avgeek-oss/mintlify-docs`, and update scripts to use the `mintlify-docs` CLI. Change any `@avgeek-oss` registry mapping to `https://registry.npmjs.org` and refresh the lockfile. Generated filenames and snippet import paths stay the same. Run `docs:sync` to update their package metadata.

Create a product-owned `docs/site.json`. Use [the runnable example](examples/site/site.json) for the required brand, navigation, header CTA, and footer fields. All additional native Mintlify options are preserved.

```json
{
  "scripts": {
    "docs:sync": "mintlify-docs sync --config docs/site.json --dir docs",
    "docs:check": "mintlify-docs check --config docs/site.json --dir docs"
  }
}
```

Run `pnpm docs:sync`, commit its output, and run `pnpm docs:check` in CI before Mintlify validation. Repeat after upgrading the pinned kit. The command only writes its declared generated files; it leaves product pages, assets, and local styles untouched.

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
- [Writing documentation](docs/authoring.md): task guides, reference pages, native Mintlify components, examples, screenshots, and verification.
- [Contributing](CONTRIBUTING.md): local checks, preview, package contracts, and releases.

## Develop

```bash
pnpm install --frozen-lockfile
pnpm verify
pnpm dev
```

The example preview runs at `http://localhost:4176`. CI also validates the example with Mintlify's pinned CLI. Package verification installs the tarball into a fresh temporary project and runs both generation and drift checking outside this checkout.

Releases use `v<package version>` tags on `main`. CI verifies the package first, then publishes the same tarball publicly to npmjs.org using GitHub Actions OIDC. No publishing runs on pull requests or ordinary branch pushes. Configure `avgeek-oss/oss-docs` with workflow `ci.yml` as the package's npm trusted publisher. The initial npm package is created interactively from its tagged release's verified artifact; subsequent releases need no stored publishing token. Existing GitHub Packages versions remain available for old checkouts.

Licensed under Apache-2.0. The initial layout is extracted from [Towbar](https://github.com/avgeek-oss/towbar).
