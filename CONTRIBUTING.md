# Contributing

Use Node.js 24 and pnpm 11. Run `pnpm install --frozen-lockfile`, then `pnpm verify`. After changing snippets, styles, header behavior, or configuration defaults, run `pnpm sync:example` and commit the generated example too.

Run `pnpm dev` to inspect the actual Mintlify example. Review the homepage and guide in light/dark themes at desktop and mobile widths. Preserve search, category navigation, nested groups, theme controls, keyboard focus, CTA destinations, and footer links.

Use `pnpm format` for formatting. Add behavioral tests for generator ownership, invalid configuration, drift, DOM bridging, and packaged consumption. Follow AGENTS.md for sandbox and code rules.

For an authorized release, update package.json and CHANGELOG.md, regenerate the example, and merge verified changes into main. Create a matching `v<version>` tag. The workflow checks main ancestry and verifies the tarball before publishing it to GitHub Packages, then checks registry integrity. Ordinary pushes and PRs do not publish.
