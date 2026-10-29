# Avgeek OSS Mintlify Docs

Shared Mintlify homepage layouts, documentation primitives, and site tooling for Avgeek OSS projects. Product repositories own their content, branding, navigation destinations, screenshots, API schemas, analytics, and legal pages.

Mintlify custom components cannot import external npm packages. This kit installs as a development tool and generates local JSX snippets, CSS, JavaScript, and `docs.json` for Mintlify to serve directly. Commit those generated files. CI checks them against the exact installed kit so edits cannot silently drift.

## Install and use

Use Node.js 26 and pnpm 11. The package is public on npmjs.org and requires no registry credentials.

```bash
pnpm add -Dw @avgeek-oss/mintlify-docs@0.2.0
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

## Development

These are development notes for the maintainers. We are not accepting contributions from public sources, to curb automated pull requests and because there are no dedicated resources to review and sign them off. Feedback and issues are welcome in this repository; we triage them and strive to fix them at the earliest. Report security vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

Use Node.js 26 and pnpm 11. Development rules are in [AGENTS.md](AGENTS.md).

```bash
pnpm install --frozen-lockfile
pnpm verify
pnpm validate:fixture
pnpm dev
```

`pnpm verify` checks formatting, runs oxlint and Stylelint and the tests, and installs the packed tarball into a fresh temporary project outside this checkout, where it runs generation and drift checking. Tests sync the fixture site in `test/fixtures/site.mjs` into temporary directories; nothing generated is committed. When a change adds a feature or export, exercise it in the fixture.

`pnpm validate:fixture` runs Mintlify's pinned validation, broken-link and accessibility checks on the fixture's generated output; it needs network access, and CI runs it too. To move to a newer Mintlify CLI, change `mintVersion` in `src/validate.mjs` and the `dev` script together. `pnpm dev` writes the fixture into `.preview/` (not committed), syncs it and serves it at `http://localhost:4176`. Review the homepage and guide in light and dark themes at desktop and mobile widths, and check that search, category navigation, nested groups, theme controls, keyboard focus, CTA destinations and footer links still work.

Release notes are in [CHANGELOG.md](CHANGELOG.md). Source and third-party attribution are in `NOTICE` and `LICENSE`.

## Publishing

Pull requests and pushes to `main` run the `verify` check. Update the version and add its `## X.Y.Z (YYYY-MM-DD)` section to the changelog through the normal review process. Once that has merged and `main` is green, run the **Cut release** workflow from `main` (Actions, Cut release, Run workflow). It checks the version, changelog, tag and npm state, and that the verified `main` run of the commit still has its package artifact, then creates the annotated `v<version>` tag and starts the publish run on it. Pushing the same tag by hand does the same.

The publish run does not verify or rebuild again. It downloads the tarball that the `main` run of the tagged commit verified, checks its integrity, publishes those exact bytes without running package lifecycle scripts, checks that the registry serves the same integrity, and installs it in a fresh consumer. A retry accepts an existing version only if its integrity matches the verified candidate. After a successful publish, a separate job creates or updates the tag's GitHub release from that version's `CHANGELOG.md` section.

The publish job uses npm trusted publishing with GitHub Actions OIDC. Configure `avgeek-oss/oss-docs` and workflow `ci.yml` in the package's npm trusted-publisher settings. The job has `id-token: write`; no publishing token is stored in GitHub secrets. Existing GitHub Packages versions remain available for old checkouts.

Licensed under Apache-2.0. The initial layout is extracted from [Towbar](https://github.com/avgeek-oss/towbar).
