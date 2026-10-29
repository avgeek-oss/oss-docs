# Changelog

## Unreleased

- Export `syncSite`, `checkSite`, `checkContent`, `loadSite`, `validateSite` and `imageDimensions` from the package root with types; `bin/` is only the CLI. Its `syncSite` re-export remains for 0.1.x scripts.
- Copy `assets` listed in site.json on sync, record them in `.oss-docs.json`, compare them byte for byte on check, and remove copies a later configuration drops.
- Resolve `{ "$include": "<file>.json#/pointer" }` navigation lists on sync so generators no longer rewrite site.json.
- Replace `{version}` in site.json with the version from the nearest package.json, or from `packageJson`.
- Add `check --content`: navigation pages exist and compile as MDX, frontmatter title and description, duplicate and orphan routes, redirects, internal links and anchors in Markdown, attributes, frontmatter icons, CSS `url()` and `docs.json`, screenshot sizes from a manifest, and repository Markdown links. Every problem is reported.
- Add `validate`, which runs `mint validate`, `broken-links --check-anchors --check-redirects --check-snippets` and `a11y` with Mintlify 4.2.986, and use it for the example in CI.
- Label the footer GitHub social link from `footer.socials.github` instead of every GitHub icon link.
- `@mdx-js/mdx` is now a runtime dependency, loaded only by `check --content`.

- Show the repository name beside the footer GitHub icon and align the link to the right edge of the brand row.

- Increase the homepage maximum width to 1280px and use 32px horizontal padding in the desktop header.

- Cap footer content at 1280px with responsive horizontal padding and tighter link spacing; retain native header and documentation widths.

- Use the available width for hero descriptions and add space between separate statements on mobile.
- Reduce mobile hero top padding and add space below hero headings at every width.

## 0.1.5

- Keep the native footer logo and social links together in one row at desktop widths.

## 0.1.4

- Show the native advanced footer on homepages, with a brand row, wrapping link columns, and space after homepage content.

## 0.1.3

- Publish the verified tarball with an explicit local path so npm does not interpret it as a GitHub repository.

## 0.1.2

- Use native Mintlify CTA markup for homepage actions and one readable accent across header buttons, hero text and links in each theme.
- Add shared SEO defaults while preserving page-specific metadata and canonical URL paths.

## 0.1.1

- Match homepage actions to product button sizing and derive readable button text from each brand color.
- Use the configured light and dark colors for homepage heading accents independently of the primary action color.

## 0.1.0

- Extract composable homepage layouts, themed screenshots and header behavior from Towbar.
- Add native Mintlify category navigation defaults, deterministic sync/check tooling and an integrity manifest.
- Document authoring conventions and validate the installed package with a standalone example site.
