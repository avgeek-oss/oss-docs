# Navigation and site configuration

Use `site.json` for product-owned configuration. The `assets`, `packageJson` and `content` keys configure the tooling and never reach `docs.json`; see [Site tooling](tooling.md). `defineSite` adds the mint theme, system appearance, Lucide icons, breadcrumb eyebrows, system code blocks, contextual copy/export actions, and non-drilling navigation. Native Mintlify fields such as redirects, API settings, banner, logo and socials pass through unchanged. SEO defaults index the public homepage as well as guides, retain native per-page titles/descriptions and share-card generation, and merge product metadata. Set `seo.metatags.canonical` to your exact HTTPS origin; Mintlify appends each page path. Hidden pages are public and indexed unless individually excluded; never put private content in the docs root.

Use `navigation.dropdowns` for main documentation categories. Each category contains named `groups`; each group contains page paths and optional nested groups. Page paths omit the leading slash and extension. Every page appears once in navigation. Keep the homepage outside the documentation categories. Generated reference pages join navigation through a `{ "$include": "<file>.json" }` list, so generators never rewrite `site.json`.

```json
{
  "navigation": {
    "dropdowns": [
      {
        "dropdown": "Introduction",
        "icon": "book-open",
        "groups": [
          {
            "group": "Get started",
            "pages": ["docs/index", "docs/getting-started"]
          }
        ]
      }
    ]
  }
}
```

Do not replace category navigation with a custom React router or copied sidebar. Mintlify owns search, mobile navigation, selected page state, and keyboard behavior. Product repositories choose the category labels and order from their actual tasks; the kit does not impose Towbar-specific categories.

Define `navbar.primary` for the header CTA, `footer.links` for the footer groups and `footer.socials.github` for the repository. The header bridge adds the product wordmark and retains the native CTA beside the appearance control. Internal documentation opens in the same tab; external targets and link rel are preserved. Native search and theme controls remain intact. The shared footer stays visible on custom homepages.

The generator writes exactly: `docs.json`, `oss-docs.css`, `oss-docs.js`, `snippets/oss/homepage.jsx`, `snippets/oss/screenshot.jsx`, the configured `assets`, and `.oss-docs.json`. The manifest records package version and generated file hashes. Commit every generated file so hosted Mintlify does not require npm installation.

Run sync after changing site.json, an included navigation file, a copied asset or the kit version, and check in CI. A drift check compares exact generated content and fails if files are edited or missing. It does not fetch remote content. `check --content` adds the page, link, redirect and screenshot checks described in [Site tooling](tooling.md); product checks keep API schema coverage and app help links.

Brand colors are six-digit hex values in `colors.primary`, `colors.light`, and `colors.dark`. Homepage actions and hero text use `colors.primary` in light mode and the lighter `colors.light` variant in dark mode, with button text chosen for contrast. Additional product styles can use the shared `--oss-*` variables without copying layout rules. Keep logo/provider styling and product-only assets local.

Choose a dark, readable `colors.primary` and a lighter `colors.light` variant for dark backgrounds. Header and hero CTAs and hero text use the same active accent in each theme. `ActionLink` renders Mintlify's native header CTA structure and utility classes; there is no separate button geometry. Shared CSS only fills the native background and foreground color slots, with a neutral secondary variant.

## Footer structure

Use native `footer.links` groups rather than a separate footer snippet. Start with **Documentation**, linking to the product's quickstart, installation, connection guide and operational reference. Add **Our OSS Philosophy**, linking to the [Avgeek OSS organization README](https://github.com/avgeek-oss/.github/blob/main/profile/README.md), the product repository and its issue tracker. Add **Other OSS Apps** with a short purpose beside each other application. Link to its public site when available, otherwise its public repository. Verify that repositories are visible to unauthenticated visitors; access through a signed-in account is not evidence of public visibility. When direct public destinations are unavailable, use an accurately labeled link to the organization’s public project directory. Keep any existing legal destinations. These are ordinary crawlable links; do not add `nofollow` or client-only navigation.

Product repositories own the links and labels in `site.json`. Exclude the current app from Other OSS Apps, and do not advertise guessed domains or planned features.

The shared footer uses a centered 1280px maximum width and responsive horizontal padding. The header and documentation layout retain their native Mintlify widths. The desktop header uses 32px horizontal padding. Footer links use compact desktop spacing and retain 44px touch targets on mobile. Product-owned styles can add decorative favicons to specific links without changing their labels or destinations.

The shared stylesheet keeps a 72px gap below homepage content (48px on mobile), then lays out Mintlify's advanced footer as a brand/social row, native link columns and the native utility row. The native GitHub social link displays the `owner/repository` name from `footer.socials.github` and sits at the right edge of the brand row; product repositories need no footer script of their own. Link labels wrap instead of truncating. The DOM bridge targets Mintlify's `#footer.advanced-footer` and its native brand/link/social row; changes to that structure require rendered desktop/mobile verification. Search, appearance controls and Mintlify attribution stay native.
