export const siteDefaults = Object.freeze({
  $schema: "https://mintlify.com/docs.json",
  theme: "mint",
  appearance: { default: "system" },
  icons: { library: "lucide" },
  styling: { eyebrows: "breadcrumbs", codeblocks: "system" },
  interaction: { drilldown: false },
  contextual: { options: ["copy", "view", "chatgpt", "claude"] },
});

export function defineSite(input) {
  if (!input || typeof input.name !== "string" || !input.name.trim())
    throw new Error("A site needs a product name");
  if (!input.colors?.primary || !input.colors?.light || !input.colors?.dark)
    throw new Error("A site needs primary, light and dark brand colors");
  if (!input.navbar?.primary?.href || !input.footer?.links?.length)
    throw new Error("Define the header CTA and footer link groups");
  validateNavigation(input.navigation);
  return { ...structuredClone(siteDefaults), ...structuredClone(input) };
}

export function validateNavigation(navigation) {
  if (!Array.isArray(navigation?.dropdowns) || !navigation.dropdowns.length)
    throw new Error(
      "Use native Mintlify dropdown categories with groups and pages",
    );
  const pages = new Set();
  const walk = (node) => {
    if (typeof node === "string") {
      if (!node || node.startsWith("/") || node.includes(".."))
        throw new Error(`Invalid navigation page: ${node}`);
      if (pages.has(node))
        throw new Error(`Duplicate navigation page: ${node}`);
      pages.add(node);
    } else if (Array.isArray(node)) node.forEach(walk);
    else if (node && typeof node === "object") {
      for (const [key, value] of Object.entries(node)) {
        if (["dropdowns", "groups", "pages", "tabs", "anchors"].includes(key))
          walk(value);
      }
    }
  };
  for (const category of navigation.dropdowns) {
    if (
      !category.dropdown ||
      !Array.isArray(category.groups) ||
      !category.groups.length
    )
      throw new Error("Each category needs a label and page groups");
  }
  walk(navigation);
  return [...pages];
}
