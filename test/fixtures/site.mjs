// A minimal Mintlify site that exercises every feature of the kit: assets,
// a navigation include, {version}, the footer repository label, both
// snippet files and a screenshot manifest. Tests, package verification,
// Mintlify validation and `pnpm dev` write it into a directory of their own;
// nothing generated from it is committed.
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export const fixtureSite = {
  name: "Example",
  description: "A sample project for the shared documentation kit.",
  logo: {
    light: "/assets/logo.svg",
    dark: "/assets/logo.svg",
    href: "/",
  },
  favicon: "/assets/logo.svg",
  colors: {
    primary: "#A16207",
    light: "#B08505",
    dark: "#B9872C",
  },
  navigation: {
    dropdowns: [
      {
        dropdown: "Introduction",
        icon: "book-open",
        groups: [
          {
            group: "Get started",
            pages: ["guide"],
          },
          {
            group: "Reference",
            pages: {
              $include: "reference-navigation.json",
            },
          },
        ],
      },
    ],
  },
  navbar: {
    primary: {
      type: "button",
      label: "Docs",
      href: "/guide",
    },
  },
  footer: {
    links: [
      {
        header: "Documentation",
        items: [
          {
            label: "Get started with v{version}",
            href: "/guide",
          },
          {
            label: "Reference",
            href: "/reference",
          },
        ],
      },
      {
        header: "Our OSS Philosophy",
        items: [
          {
            label: "Why we build open source",
            href: "https://github.com/avgeek-oss/.github/blob/main/profile/README.md",
          },
          {
            label: "Report an issue",
            href: "https://github.com/avgeek-oss/oss-docs/issues",
          },
        ],
      },
      {
        header: "Other OSS Apps",
        items: [
          {
            label: "Towbar · Deploy your apps",
            href: "https://www.towbar.dev",
          },
          {
            label: "Vitalog · Keep your health ledger",
            href: "https://www.vitalog.dev",
          },
          {
            label: "All OSS projects",
            href: "https://github.com/avgeek-oss/.github/blob/main/profile/README.md#whats-in-the-list",
          },
        ],
      },
    ],
    socials: {
      github: "https://github.com/avgeek-oss/oss-docs",
    },
  },
  redirects: [],
  assets: [
    {
      from: "../brand/logo.svg",
      to: "assets/logo.svg",
    },
  ],
  content: {
    screenshots: "screenshots.json",
  },
};

export const fixturePages = {
  "index.mdx": `---
title: "Example project"
description: "Shared homepage components with product-owned content."
mode: "custom"
---

import {
  Home,
  Hero,
  Actions,
  ActionLink,
  ProductFrame,
  Highlights,
  Process,
  SectionIntro,
  Eyebrow,
  FeatureGroup,
  Feature,
  FeatureCopy,
  FeatureImage,
  InlineLink,
} from "/snippets/oss/homepage.jsx";
import { ThemeImage } from "/snippets/oss/screenshot.jsx";

<Home>
  <Hero id="hero-heading">
    <h1 id="hero-heading">
      Your project.
      <br />
      <span>A clear starting point.</span>
    </h1>
    <p className="oss-lead">
      <span>Product-owned content, shared documentation structure.</span>
      <span>
        Write a guide, add screenshots, and keep the same layout across your
        documentation.
      </span>
    </p>
    <Actions>
      <ActionLink href="/guide">Get started →</ActionLink>
      <ActionLink variant="secondary" href="/reference">
        Reference →
      </ActionLink>
    </Actions>
  </Hero>
  <ProductFrame>
    <ThemeImage
      light="/screen.svg"
      alt="Example application layout"
      width={1200}
      height={700}
      priority
    />
  </ProductFrame>
  <Highlights aria-label="Capabilities">
    <div>
      <h2>Understand the product</h2>
      <p>Start with the model and a working example.</p>
      <InlineLink href="/guide">Read the guide →</InlineLink>
    </div>
    <div>
      <h2>Operate with confidence</h2>
      <p>Document prerequisites, outcomes, and recovery.</p>
      <InlineLink href="/guide">See the workflow →</InlineLink>
    </div>
    <div>
      <h2>Automate safely</h2>
      <p>Keep API references generated from contracts.</p>
      <InlineLink href="/reference">Browse the reference →</InlineLink>
    </div>
  </Highlights>
  <Process id="process-heading">
    <SectionIntro>
      <Eyebrow>How it works</Eyebrow>
      <h2 id="process-heading">From setup to useful work.</h2>
    </SectionIntro>
    <ol>
      <li>
        <span>01</span>
        <h3>Install</h3>
        <p>Follow the verified prerequisites.</p>
      </li>
      <li>
        <span>02</span>
        <h3>Configure</h3>
        <p>Choose the settings for your environment.</p>
      </li>
      <li>
        <span>03</span>
        <h3>Verify</h3>
        <p>Confirm the expected result.</p>
      </li>
    </ol>
  </Process>
  <FeatureGroup>
    <Feature id="feature-heading">
      <FeatureCopy>
        <Eyebrow>Workflows</Eyebrow>
        <h2 id="feature-heading">Explain the next action.</h2>
        <p>Each product provides its own screenshot, copy, and destination.</p>
        <InlineLink href="/guide">Explore the workflow →</InlineLink>
      </FeatureCopy>
      <FeatureImage>
        <ThemeImage
          light="/screen.svg"
          alt="Example workflow layout"
          width={1200}
          height={700}
        />
      </FeatureImage>
    </Feature>
  </FeatureGroup>
</Home>
`,
  "guide.mdx": `---
title: "Get started"
description: "A task-oriented documentation example."
---

import { Screenshot } from "/snippets/oss/screenshot.jsx";

## Browse by task

<CardGroup cols={2}>
  <Card title="Introduction" icon="book-open" href="/guide">
    Start with the product model and a working example.
  </Card>
  <Card title="Reference" icon="square-terminal" href="/reference">
    Look up the exact configuration contract.
  </Card>
</CardGroup>

## Complete a workflow

<Steps>
  <Step title="Prepare">State prerequisites before the first command.</Step>
  <Step title="Configure">Use a working example with safe sample values.</Step>
  <Step title="Verify">Describe the visible result and the recovery path.</Step>
</Steps>

<Screenshot
  light="/screen.svg"
  alt="Example workflow layout"
  width={1200}
  height={700}
  caption="Show the result next to the task it explains."
/>

<Note>
  Use native Mintlify components for prose; shared snippets own repeated custom
  layouts.
</Note>
`,
  "reference.mdx": `---
title: "Reference"
description: "Configuration details stay with the application."
---

Use a reference page for exact fields, limits, defaults, and examples. Keep API schemas generated from application contracts.

<CodeGroup>
\`\`\`json Example configuration
{ "name": "Example" }
\`\`\`
\`\`\`bash Validate
pnpm docs:check
\`\`\`
</CodeGroup>
`,
};

const files = {
  "package.json": JSON.stringify(
    { name: "fixture-docs", private: true, version: "1.0.0" },
    null,
    2,
  ),
  "brand/logo.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect x="3" y="3" width="34" height="34" rx="8" fill="#A16207"/><path d="M12 12h16v4H16v4h10v4H16v4h12v4H12z" fill="white"/></svg>
`,
  "site/site.json": JSON.stringify(fixtureSite, null, 2),
  "site/reference-navigation.json": JSON.stringify(["reference"]),
  "site/screenshots.json": JSON.stringify({
    screenshots: [{ light: "/screen.svg", width: 1200, height: 700 }],
  }),
  "site/.mintignore": `# Tooling inputs for mintlify-docs; not documentation pages.
site.json
reference-navigation.json
screenshots.json
`,
  "site/screen.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 700"><rect width="1200" height="700" fill="#eee"/><rect x="30" y="30" width="200" height="640" rx="12" fill="#ddd"/><rect x="260" y="30" width="910" height="300" rx="12" fill="white"/><rect x="260" y="360" width="440" height="310" rx="12" fill="white"/><rect x="730" y="360" width="440" height="310" rx="12" fill="white"/><text x="300" y="120" fill="#555" font-size="40">Your application</text></svg>
`,
  ...Object.fromEntries(
    Object.entries(fixturePages).map(([name, page]) => [`site/${name}`, page]),
  ),
};

// Writes the fixture's sources under root and returns the paths to pass as
// --config and --dir. Run sync afterwards to generate the kit's files.
export async function writeFixtureSite(root) {
  for (const [name, content] of Object.entries(files)) {
    await mkdir(dirname(join(root, name)), { recursive: true });
    await writeFile(join(root, name), content);
  }
  return { config: join(root, "site/site.json"), dir: join(root, "site") };
}
