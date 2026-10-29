import { readFile, stat } from "node:fs/promises";
import { dirname, isAbsolute, posix, resolve } from "node:path";
import { defineSite } from "./config.mjs";

// Files sync writes itself; an asset may not take one of these paths.
export const generatedFiles = Object.freeze([
  "docs.json",
  "oss-docs.css",
  "oss-docs.js",
  "snippets/oss/homepage.jsx",
  "snippets/oss/screenshot.jsx",
  ".oss-docs.json",
]);

async function readJson(path, what) {
  let text;
  try {
    text = await readFile(path, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") throw new Error(`Missing ${what}: ${path}`);
    throw error;
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON in ${what} ${path}: ${error.message}`);
  }
}

function pointer(value, fragment, source) {
  if (!fragment) return value;
  if (!fragment.startsWith("/"))
    throw new Error(`Navigation include ${source} needs a JSON pointer`);
  let current = value;
  for (const raw of fragment.slice(1).split("/")) {
    const key = decodeURIComponent(raw)
      .replaceAll("~1", "/")
      .replaceAll("~0", "~");
    if (
      current === null ||
      typeof current !== "object" ||
      !Object.hasOwn(current, key)
    )
      throw new Error(`Navigation include ${source} does not exist`);
    current = current[key];
  }
  return current;
}

async function readInclude(node, base, stack) {
  const keys = Object.keys(node);
  if (keys.length !== 1 || typeof node.$include !== "string" || !node.$include)
    throw new Error(
      'A navigation include is exactly { "$include": "<file>.json" }',
    );
  const [file, fragment = ""] = node.$include.split("#", 2);
  if (isAbsolute(file) || !file.endsWith(".json"))
    throw new Error(
      `Navigation include ${node.$include} must be a relative .json file`,
    );
  const path = resolve(base, file);
  const id = `${path}#${fragment}`;
  if (stack.includes(id))
    throw new Error(`Navigation include cycle: ${node.$include}`);
  const value = pointer(
    await readJson(path, "navigation include"),
    fragment,
    node.$include,
  );
  if (!Array.isArray(value))
    throw new Error(`Navigation include ${node.$include} must be an array`);
  return resolveIncludes(value, dirname(path), [...stack, id]);
}

const isInclude = (node) =>
  node !== null &&
  typeof node === "object" &&
  !Array.isArray(node) &&
  "$include" in node;

// Replaces `{ "$include": "file.json#/pointer" }` in navigation lists.
// As a `pages`/`groups` value it supplies the whole list; as a list item
// its entries are spliced in place.
export async function resolveIncludes(node, base, stack = []) {
  if (Array.isArray(node)) {
    const items = [];
    for (const item of node) {
      if (isInclude(item))
        items.push(...(await readInclude(item, base, stack)));
      else items.push(await resolveIncludes(item, base, stack));
    }
    return items;
  }
  if (node === null || typeof node !== "object") return node;
  if (isInclude(node))
    throw new Error(
      `Navigation include ${JSON.stringify(node.$include)} must be a pages or groups list or one of its items`,
    );
  const result = {};
  for (const [key, value] of Object.entries(node))
    result[key] =
      ["pages", "groups"].includes(key) && isInclude(value)
        ? await readInclude(value, base, stack)
        : await resolveIncludes(value, base, stack);
  return result;
}

function mentionsVersion(value) {
  if (typeof value === "string") return value.includes("{version}");
  if (Array.isArray(value)) return value.some(mentionsVersion);
  if (value && typeof value === "object")
    return Object.values(value).some(mentionsVersion);
  return false;
}

function substituteVersion(value, version) {
  if (typeof value === "string") return value.replaceAll("{version}", version);
  if (Array.isArray(value))
    return value.map((item) => substituteVersion(item, version));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        substituteVersion(item, version),
      ]),
    );
  return value;
}

async function nearestPackageJson(directory) {
  for (let current = directory; ; current = dirname(current)) {
    const candidate = resolve(current, "package.json");
    try {
      if ((await stat(candidate)).isFile()) return candidate;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    if (dirname(current) === current)
      throw new Error(
        `site.json uses {version}, but no package.json exists above ${directory}; set packageJson`,
      );
  }
}

export async function packageVersion(input, base) {
  if (input.packageJson !== undefined && typeof input.packageJson !== "string")
    throw new Error("packageJson must be a path relative to site.json");
  const path = input.packageJson
    ? resolve(base, input.packageJson)
    : await nearestPackageJson(base);
  const { version } = await readJson(path, "package.json");
  if (typeof version !== "string" || !version)
    throw new Error(`${path} has no version to substitute for {version}`);
  return version;
}

function sitePath(value, what) {
  if (typeof value !== "string" || !value)
    throw new Error(`${what} must be a non-empty path`);
  const path = posix.normalize(value.replace(/^\/+/, ""));
  if (path.startsWith("../") || path === ".." || path === ".")
    throw new Error(`${what} must stay inside the content directory: ${value}`);
  return path;
}

function parseAssets(assets, base) {
  if (assets === undefined) return [];
  if (!Array.isArray(assets))
    throw new Error("assets must be a list of { from, to } entries");
  const targets = new Set();
  return assets.map((asset, index) => {
    const label = `assets[${index}]`;
    if (
      !asset ||
      typeof asset !== "object" ||
      Object.keys(asset).some((key) => !["from", "to"].includes(key))
    )
      throw new Error(`${label} must be exactly { from, to }`);
    if (typeof asset.from !== "string" || !asset.from || isAbsolute(asset.from))
      throw new Error(`${label}.from must be a path relative to site.json`);
    const to = sitePath(asset.to, `${label}.to`);
    if (generatedFiles.includes(to) || to.startsWith("snippets/oss/"))
      throw new Error(`${label}.to would replace a generated file: ${to}`);
    if (targets.has(to)) throw new Error(`Duplicate asset target: ${to}`);
    targets.add(to);
    return { from: resolve(base, asset.from), to };
  });
}

const contentKeys = ["standalone", "markdown", "exclude", "screenshots"];

function stringList(value, what) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string"))
    throw new Error(`${what} must be a list of strings`);
  return value;
}

function parseContent(content, base) {
  if (content === undefined) content = {};
  if (!content || typeof content !== "object" || Array.isArray(content))
    throw new Error("content must be an object");
  const unknown = Object.keys(content).filter(
    (key) => !contentKeys.includes(key),
  );
  if (unknown.length)
    throw new Error(`Unknown content option: ${unknown.join(", ")}`);
  if (
    content.screenshots !== undefined &&
    (typeof content.screenshots !== "string" || !content.screenshots)
  )
    throw new Error("content.screenshots must be a path relative to site.json");
  return {
    standalone: stringList(content.standalone, "content.standalone"),
    markdown: stringList(content.markdown, "content.markdown").map((path) =>
      resolve(base, path),
    ),
    exclude: stringList(content.exclude, "content.exclude"),
    screenshots:
      content.screenshots === undefined
        ? undefined
        : resolve(base, content.screenshots),
  };
}

// Reads site.json with includes and {version} resolved. `site` is the exact
// docs.json configuration; `assets` and `content` configure the tooling.
export async function loadSite(config) {
  const path = resolve(config);
  const base = dirname(path);
  let input = await readJson(path, "site configuration");
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error(`${path} must contain a JSON object`);
  input = {
    ...input,
    navigation: await resolveIncludes(input.navigation, base),
  };
  if (mentionsVersion(input))
    input = substituteVersion(input, await packageVersion(input, base));
  return {
    config: path,
    site: defineSite(input),
    assets: parseAssets(input.assets, base),
    content: parseContent(input.content, base),
  };
}
