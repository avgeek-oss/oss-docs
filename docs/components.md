# Homepage and screenshots

Import named components from `/snippets/oss/homepage.jsx` and `/snippets/oss/screenshot.jsx`. Import both files directly in the page when needed. Native Mintlify prose components remain the default for guide content.

## Homepage composition

Use `Home` once for a custom homepage. Use `Hero` for its heading and lead copy. `Hero`, `Process`, `SplitSection`, `Feature`, and `Spotlight` accept an `id` matching the heading inside them; this connects the section to an accessible name.

| Component      | Use and composition                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------- |
| Home           | Root layout, maximum 1200px, responsive side padding.                                                   |
| Hero           | Centered heading, lead copy and Actions.                                                                |
| Actions        | Wrapping action row; contains ActionLink.                                                               |
| ActionLink     | Navigation action; primary by default, secondary for an auxiliary destination. No other variant exists. |
| InlineLink     | Text navigation within sections. Use a native prose link in guides.                                     |
| ProductFrame   | Full-width lead screenshot frame; contains ThemeImage.                                                  |
| Highlights     | Three columns of short capability summaries; one column on mobile.                                      |
| SectionIntro   | Section heading, optional Eyebrow and explanatory copy.                                                 |
| Eyebrow        | Brief section label. Do not repeat the heading.                                                         |
| Process        | Ordered workflow; contains SectionIntro and a native ol.                                                |
| SplitSection   | Intro beside Points; stacks on smaller screens.                                                         |
| Points         | Native div entries with headings and paragraphs.                                                        |
| FeatureGroup   | Groups Feature rows with alternating image position.                                                    |
| Feature        | Heading/content beside an image; stacks at 900px.                                                       |
| FeatureCopy    | Product-owned heading, prose and link.                                                                  |
| FeatureImage   | Contains ThemeImage; shares frame sizing and borders.                                                   |
| Spotlight      | Optional compact image and text introduction.                                                           |
| SpotlightIntro | Compact image and prose inside a guide.                                                                 |

```mdx
<Feature id="workflow-heading">
  <FeatureCopy>
    <Eyebrow>Workflows</Eyebrow>
    <h2 id="workflow-heading">A concrete outcome.</h2>
    <p>Explain the action.</p>
  </FeatureCopy>
  <FeatureImage>
    <ThemeImage
      light="/assets/workflow-light.jpg"
      dark="/assets/workflow-dark.jpg"
      alt="The completed workflow"
      width={3200}
      height={1800}
    />
  </FeatureImage>
</Feature>
```

Do not put product copy inside a shared component or use CSS to reorder a mobile workflow. Composition keeps the reading order heading, description, action, then image. Product content lives in the page.

## Screenshots

Use `ThemeImage` inside ProductFrame or FeatureImage. Props: `light` (required), `dark` (defaults to light), `alt`, `width`, `height`, optional `sizes`, and `priority` (false by default). Set priority only for the homepage lead image; other images load lazily.

Use `Screenshot` inside a documentation guide. It has the same image props except priority, plus `caption` and `portrait` (false by default). It renders a figure and figcaption. Use a native Frame for a single illustration that needs no theme pairing.

```mdx
<Screenshot
  light="/assets/setup-light.jpg"
  dark="/assets/setup-dark.jpg"
  alt="Completed setup form"
  width={3200}
  height={1800}
  caption="The completed setup."
/>
```

Do not omit intrinsic dimensions or reuse a light screenshot for dark mode when the app offers a dark version. Meaningful alt text describes the task result; captions explain what readers should notice. Keep screenshots in the product repo, captured from reproducible sample data without real credentials or private data.
