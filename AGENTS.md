# Avgeek OSS Docs

This repository owns shared Mintlify homepage layouts, repeated documentation presentation, navigation defaults, authoring conventions, and deterministic generation tooling. Product repositories own facts, copy, page categories, URLs, screenshots, logos, API schemas, legal policy, analytics, and deployment configuration. Keep internal plans, adoption schedules, review diaries, transcripts, logs, and empty Markdown placeholders out of Git.

Read README.md and the relevant file under docs before changing a public contract. Inspect the actual snippet, CSS, generator, and example use before documenting an API. Keep the runtime Mintlify-compatible: named arrow-function exports, browser built-ins, no external package imports, no default exports, no cross-snippet imports. Node tooling can use declared dependencies.

## Using and extending the kit

- Import all snippet dependencies directly in the parent MDX page. Use native Mintlify Cards, Steps, Tabs, callouts, CodeGroup, fields, and tables for normal documentation. Shared snippets own repeated custom layouts, not copies of every native component.
- Homepage components compose children. Product content never belongs in shared source. Heading IDs must match `id` props and stay unique on the page. Theme images require meaningful alt text and intrinsic dimensions; only the lead image gets priority loading.
- Keep native Mintlify dropdown categories, nested groups, and page lists. Product data lives in site.json; docs.json, oss-docs.css, oss-docs.js, snippets/oss, and .oss-docs.json are generated and checked into the consumer. Never hand-edit generated outputs.
- Add a primitive only for an identified repeated responsibility. Keep it focused, compose slots, preserve accessible names and native semantics, and document its nearest alternative. Update the runnable example and package contract tests with the export.

## Code and styles

Use readable ESM, explicit public types, named functions for Node operations, and small named JSX exports for Mintlify. No any casts, ignored type errors, dead scaffold, speculative variants, empty catches, or fallbacks that hide failed generation. Catch failures once at the CLI boundary and return a nonzero exit status.

ESLint enforces unused variables, undefined names, equality, unreachable code, and empty blocks. Stylelint checks invalid colors/properties/selectors, duplicate declarations, and empty rules. Prettier owns formatting. Semantic CSS variables use the oss namespace; product primary colors come from configuration. Scope homepage rules under oss-home and keep document styles separate. Do not target unstable generated class hashes; document any Mintlify DOM bridge and verify native controls still work.

Custom header JavaScript must be idempotent, clean up observers and scheduled frames on reload, and preserve the CTA destination and rel, opening internal documentation in the same tab and retaining external targets. Keep search and theme controls native. Browser code must not read credentials, add tracking, or persist unrelated user state.

## Verification and releases

Run pnpm verify: formatting, lint, behavioral tests, generated-example drift, and an installed tarball consumer outside the checkout. Run pinned Mintlify validation, broken-link and accessibility checks on affected sites. Inspect the real Mintlify homepage and a documentation page at desktop/mobile widths in light/dark themes. Test header/footer destinations, category switching, nested pages, and themed screenshots.

Do not weaken tests to make changes pass. Tests cover observable contracts, drift, invalid input, package completeness, and browser behavior; spacing needs rendered evidence. Add real prerequisites, outcomes, and failure/recovery paths to guides. Public documentation describes shipped behavior, not business plans.

Publishing and deployment require user authorization. CI publishes only stable matching version tags on main after verification, using the verified tarball and job-scoped packages write permissions. Preserve unrelated work and distinguish local checks, CI, registry publication, and hosted-site deployment.
