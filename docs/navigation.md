# Navigation and site configuration

Use `site.json` for product-owned configuration. `defineSite` adds the mint theme, system appearance, Lucide icons, breadcrumb eyebrows, system code blocks, contextual copy/export actions, and non-drilling navigation. Native Mintlify fields such as SEO, redirects, API settings, banner, logo, and socials pass through unchanged.

Use `navigation.dropdowns` for main documentation categories. Each category contains named `groups`; each group contains page paths and optional nested groups. Page paths omit the leading slash and extension. Every page appears once in navigation. Keep the homepage outside the documentation categories.

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

Define `navbar.primary` for the header CTA and `footer.links` for the footer groups. The header bridge adds the product wordmark and retains the native CTA beside the appearance control. Internal documentation opens in the same tab; external targets and link rel are preserved. native search and theme controls remain intact. The shared footer stays visible on custom homepages.

The generator writes exactly: `docs.json`, `oss-docs.css`, `oss-docs.js`, `snippets/oss/homepage.jsx`, `snippets/oss/screenshot.jsx`, and `.oss-docs.json`. The manifest records package version and generated file hashes. Commit every generated file so hosted Mintlify does not require npm installation.

Run sync after changing site.json or upgrading the kit, and check in CI. A drift check compares exact generated content and fails if files are edited or missing. It does not fetch remote content. Existing product checks still validate page presence, redirects, API schemas, screenshot dimensions, and app help links.

Brand colors are six-digit hex values in `colors.primary`, `colors.light`, and `colors.dark`. Homepage actions use primary in light mode and dark in dark mode. Additional product styles can use the shared `--oss-*` variables without copying layout rules. Keep logo/provider styling and product-only assets local.
