# Contributing

Use Node.js 24 and pnpm 11. Run `pnpm install --frozen-lockfile`, then `pnpm verify`. Tests sync the fixture site in `test/fixtures/site.mjs` into temporary directories; nothing generated is committed. When a change adds a feature or export, exercise it in the fixture.

Run `pnpm validate:fixture` for Mintlify's pinned validation, broken-link and accessibility checks; it needs network access. To move to a newer Mintlify CLI, change `mintVersion` in `src/validate.mjs` and the `dev` script together. Run `pnpm dev` to inspect the fixture site in Mintlify; it is written to `.preview/`. Review the homepage and guide in light/dark themes at desktop and mobile widths. Preserve search, category navigation, nested groups, theme controls, keyboard focus, CTA destinations, and footer links.

Use `pnpm format` for formatting. Add behavioral tests for generator ownership, invalid configuration, drift, DOM bridging, and packaged consumption. Follow AGENTS.md for sandbox and code rules.

For an authorized release, update package.json and CHANGELOG.md, and merge verified changes into main. Create a matching `v<version>` tag. The workflow checks main ancestry and verifies the tarball before publishing it to npmjs.org, then checks registry integrity. Ordinary pushes and PRs do not publish.
