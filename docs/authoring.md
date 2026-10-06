# Writing documentation

Write for a person completing a task. Start with what they can do and what they need. Keep product claims grounded in current code and verified behavior. Public guides must not include internal plans, rollout logs, adoption schedules, or placeholder pages.

## Page types

- Task guide: prerequisites, steps, expected result, and failure/recovery path. Use native Steps for a short sequential workflow.
- Concept: the model and a concrete example. Link to a task guide and reference instead of duplicating them.
- Reference: exact fields, defaults, limits, permissions, and examples. Generate API and configuration schemas from the application contract.
- Troubleshooting: observable symptom, diagnostic step, likely cause, and verified recovery. Keep destructive operations explicit.
- Category overview: brief orientation and native Cards linking to the tasks in that category. Match the labels and destinations in navigation.

Every published MDX page needs a concrete title and description in frontmatter. A custom homepage also sets `mode: "custom"`. Use one page title; guide body headings start at level two. Use selective bold for UI labels and key constraints, not whole paragraphs.

## Native primitives

| Need                                               | Use                                                                          |
| -------------------------------------------------- | ---------------------------------------------------------------------------- |
| Choose a task or category                          | Card/CardGroup with a meaningful title and destination.                      |
| Follow a short sequence                            | Steps/Step, with an expected result after the action.                        |
| Compare installation tools or equivalent languages | CodeGroup with named, runnable code blocks.                                  |
| Switch distinct workflows                          | Tabs/Tab. Keep essential requirements visible outside tabs.                  |
| Optional details                                   | Accordion. Never hide prerequisites, safety constraints, or the main action. |
| Important context                                  | Note, Tip, Warning, or Danger matching the actual consequence.               |
| Exact field contract                               | ParamField/ResponseField on reference pages; tables for compact comparisons. |
| Relationships                                      | Mermaid with concrete names and few nodes.                                   |
| Themed application screenshot                      | Shared Screenshot with caption and intrinsic dimensions.                     |

Use these native Mintlify components directly rather than adding wrappers with identical behavior. The shared kit adds repeated custom layouts and screenshot handling.

## Examples and verification

Use reserved example domains, safe identifiers, and explicit placeholders for credentials. Never publish tokens, private customer data, or working secrets. State the shell, tool version, environment, and required permission when they affect the outcome. Commands must be copyable and show how to verify success. Explain rollback before destructive steps.

Keep screenshots beside the task they illustrate, not in an unrelated gallery. Capture light/dark pairs from the same seeded fixture and viewport; update captions and alt text when the UI changes. Product generators own image dimensions and API contract checks.

Link to canonical internal pages. Avoid redirect chains and duplicate navigation entries. Preserve moved routes with explicit redirects. Check links and anchors, validate Mintlify configuration, and inspect mobile/light/dark rendering before declaring a guide ready.
