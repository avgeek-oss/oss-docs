import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, extname, posix, relative, resolve, sep } from "node:path";
import { validateNavigation } from "./config.mjs";
import { createIgnore } from "./ignore.mjs";
import { imageDimensions } from "./images.mjs";
import { loadSite } from "./load.mjs";

// Build and test output that repository-wide Markdown checks never read.
const outputDirectories = new Set([
  "node_modules",
  "dist",
  "tmp",
  "artifacts",
  "playwright-report",
  "test-results",
]);
const pageExtensions = new Set([".mdx", ".md"]);
const configLinkKeys = new Set([
  "href",
  "destination",
  "favicon",
  "light",
  "dark",
  "icon",
]);

const openapiOperation =
  /^(?:\S+\s+)?(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|TRACE|WEBHOOK)\s+\S/i;

const toPosix = (path) => path.split(sep).join("/");
const isInside = (root, path) => {
  const rel = relative(root, path);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== "..");
};
function display(path) {
  const rel = relative(process.cwd(), path);
  return rel && !rel.startsWith("..") ? toPosix(rel) : path;
}
const isExternal = (url) =>
  /^[a-z][a-z\d+.-]*:/i.test(url) || url.startsWith("//");
// Scans instead of using a regex: `/\/+$/` backtracks on long runs of `/`.
function trimSlashes(path) {
  let start = 0;
  let end = path.length;
  while (start < end && path[start] === "/") start++;
  while (end > start && path[end - 1] === "/") end--;
  return path.slice(start, end);
}
// Mintlify serves `a/index.mdx` at `/a` and the root `index.mdx` at `/`.
const routeKey = (path) =>
  trimSlashes(path)
    .replace(/(^|\/)index$/, "")
    .replace(/\/$/, "");

async function readOptional(path) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

// Lists files under root, skipping dot entries and `skip` directories.
// Files that `ignore` matches (or that sit in a matched directory) are
// listed separately so messages can say why a target is unpublished.
async function walk(root, { skip = () => false, ignore = () => false }) {
  const files = [];
  const ignored = [];
  async function visit(prefix) {
    const entries = await readdir(resolve(root, prefix), {
      withFileTypes: true,
    });
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (!skip(rel, entry.name)) await visit(rel);
      } else if (entry.isFile()) (ignore(rel) ? ignored : files).push(rel);
    }
  }
  await visit("");
  return { files, ignored };
}

function lineIndex(text) {
  const starts = [0];
  for (let index = 0; index < text.length; index++)
    if (text[index] === "\n") starts.push(index + 1);
  return (offset) => {
    let low = 0;
    let high = starts.length - 1;
    while (low < high) {
      const middle = (low + high + 1) >> 1;
      if (starts[middle] <= offset) low = middle;
      else high = middle - 1;
    }
    return low + 1;
  };
}

const blank = (text) => text.replace(/[^\n]/g, " ");

function frontmatter(text) {
  const match = text.match(/^---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/);
  if (!match) return { data: null, length: 0 };
  const data = {};
  let offset = text.indexOf("\n") + 1;
  for (const line of match[1].split("\n")) {
    const field = line.match(/^([A-Za-z_][\w-]*)[ \t]*:[ \t]*(.*?)[ \t]*$/);
    if (field) {
      let value = field[2];
      if (/^".*"$/.test(value)) {
        try {
          value = JSON.parse(value);
        } catch {
          value = value.slice(1, -1);
        }
      } else if (/^'.*'$/.test(value))
        value = value.slice(1, -1).replaceAll("''", "'");
      data[field[1]] = { value, offset };
    }
    offset += line.length + 1;
  }
  return { data, length: match[0].length };
}

// Blanks frontmatter, code, and comments while keeping offsets and lines.
function prose(text, frontmatterLength) {
  const lines = (
    blank(text.slice(0, frontmatterLength)) + text.slice(frontmatterLength)
  ).split("\n");
  let fence = null;
  for (let index = 0; index < lines.length; index++) {
    const marker = lines[index].match(/^\s*(`{3,}|~{3,})/)?.[1];
    if (fence) {
      if (
        marker &&
        marker[0] === fence[0] &&
        marker.length >= fence.length &&
        lines[index].trim() === marker
      )
        fence = null;
      lines[index] = blank(lines[index]);
    } else if (marker) {
      fence = marker;
      lines[index] = blank(lines[index]);
    }
  }
  const blocks = lines
    .join("\n")
    .replace(/<!--[\s\S]*?-->|\{\/\*[\s\S]*?\*\/\}/g, blank);
  // Headings keep inline code; links inside inline code are not links.
  return { blocks, body: blocks.replace(/`[^`\n]*`/g, blank) };
}

// Repeats until stable, so removing one tag can't leave another behind.
function stripTags(text) {
  let previous;
  do {
    previous = text;
    text = text.replace(/<[^<>]*>/g, "");
  } while (text !== previous);
  return text;
}

function slug(text) {
  return stripTags(text.replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1"))
    .toLowerCase()
    .replace(/[`*_~]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}

function anchors(text) {
  const found = new Set();
  const counts = new Map();
  for (const match of text.matchAll(
    /^ {0,3}#{1,6}[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/gm,
  )) {
    const base = slug(match[1]);
    const count = counts.get(base) ?? 0;
    found.add(count ? `${base}-${count}` : base);
    counts.set(base, count + 1);
  }
  for (const match of text.matchAll(/(?<![\w-])id=(?:"([^"]+)"|'([^']+)')/g))
    found.add(match[1] ?? match[2]);
  return found;
}

// Markdown links and images (with <url> and titles), reference definitions,
// and the href/src/light/dark/icon attributes of JSX and HTML elements.
function* links(text) {
  for (const match of text.matchAll(
    /\]\(\s*(<[^>\n]*>|[^\s()]*(?:\([^\s()]*\)[^\s()]*)*)(?:\s+(?:"[^"\n]*"|'[^'\n]*'|\([^)\n]*\)))?\s*\)/g,
  ))
    yield { url: match[1].replace(/^<|>$/g, ""), index: match.index };
  for (const match of text.matchAll(
    /^ {0,3}\[[^\]\n]+\]:[ \t]*(<[^>\n]*>|\S+)/gm,
  ))
    yield { url: match[1].replace(/^<|>$/g, ""), index: match.index };
  for (const match of text.matchAll(
    /(?<![\w-])(href|src|light|dark|icon)=(?:"([^"\n]*)"|'([^'\n]*)')/g,
  )) {
    const url = match[2] ?? match[3];
    if (match[1] === "icon" && !url.startsWith("/")) continue;
    yield { url, index: match.index };
  }
}

function splitUrl(url) {
  const hashAt = url.indexOf("#");
  const path = (hashAt === -1 ? url : url.slice(0, hashAt)).split("?")[0];
  const hash = hashAt === -1 ? "" : url.slice(hashAt + 1);
  return { path: decodeURIComponent(path), hash: decodeURIComponent(hash) };
}

function* configLinks(node, path = "") {
  if (Array.isArray(node))
    for (const [index, item] of node.entries())
      yield* configLinks(item, `${path}[${index}]`);
  else if (node && typeof node === "object")
    for (const [key, value] of Object.entries(node)) {
      const at = path ? `${path}.${key}` : key;
      if (typeof value === "string") {
        if (configLinkKeys.has(key) && /^\/(?!\/)/.test(value))
          yield { url: value, path: at };
      } else yield* configLinks(value, at);
    }
}

// Checks what a Mintlify site publishes: navigation pages exist and compile
// as MDX, frontmatter, duplicate and orphan routes, redirects, internal links
// and anchors, assets in Markdown, attributes, frontmatter icons and CSS
// url(), optional screenshot dimensions, and repository Markdown links.
// Returns every problem instead of stopping at the first one.
export async function checkContent({ config, dir, loaded }) {
  loaded ??= await loadSite(config);
  const { site, content } = loaded;
  const root = resolve(dir);
  const configLabel = display(loaded.config);
  const problems = [];
  let linkCount = 0;
  let imageCount = 0;

  const mintignore = createIgnore(
    ((await readOptional(resolve(root, ".mintignore"))) ?? "").split("\n"),
  );
  const tree = await walk(root, {
    skip: (rel, name) => name === "node_modules",
    ignore: (rel) => mintignore(rel),
  });
  const published = new Set(tree.files);
  const ignored = new Set(tree.ignored);

  const allPages = [];
  const pages = new Map();
  const routes = new Map();
  for (const rel of tree.files) {
    if (!pageExtensions.has(extname(rel))) continue;
    const id = rel.slice(0, -extname(rel).length);
    const snippet = rel.startsWith("snippets/");
    const path = resolve(root, rel);
    const text = (await readFile(path, "utf8")).replace(/\r\n?/g, "\n");
    const meta = frontmatter(text);
    const { blocks, body } = prose(text, meta.length);
    const page = { id, rel, path, text, meta, body, snippet };
    page.anchors = anchors(blocks);
    page.line = lineIndex(text);
    allPages.push(page);
    if (snippet) continue;
    const key = routeKey(id);
    const existing = routes.get(key);
    if (existing)
      problems.push(
        `${display(path)}: publishes /${key}, as ${existing.rel} does`,
      );
    else routes.set(key, page);
    if (!pages.has(id)) pages.set(id, page);
  }

  const redirects = new Map();
  const patterns = [];
  for (const [index, redirect] of (site.redirects ?? []).entries()) {
    const source = redirect?.source;
    if (typeof source !== "string") continue;
    if (/[:*]/.test(source)) {
      // Path parameters such as /blog/:slug or /blog/:slug* match any value.
      patterns.push(
        new RegExp(
          `^${trimSlashes(source)
            .split("/")
            .map((part) =>
              part.startsWith(":")
                ? part.endsWith("*")
                  ? ".*"
                  : "[^/]+"
                : part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            )
            .join("/")}$`,
        ),
      );
      continue;
    }
    const key = trimSlashes(source);
    if (redirects.has(key))
      problems.push(
        `${configLabel} redirects[${index}]: duplicate redirect source ${source}`,
      );
    redirects.set(key, redirect.destination);
    const page = routes.get(routeKey(key));
    if (page)
      problems.push(
        `${configLabel} redirects[${index}]: ${source} shadows ${display(page.path)}; delete the page or the redirect`,
      );
  }

  function resolveSite(target, hash) {
    let route = target;
    let anchor = hash;
    const seen = new Set();
    for (;;) {
      const key = trimSlashes(route);
      if (!redirects.has(key)) break;
      if (seen.has(key)) return "ends in a redirect cycle";
      seen.add(key);
      const destination = redirects.get(key);
      if (typeof destination !== "string") return "redirects nowhere";
      if (isExternal(destination) || /[:*]/.test(destination)) return null;
      let next;
      try {
        next = splitUrl(destination);
      } catch {
        return `redirects to malformed ${destination}`;
      }
      route = next.path.startsWith("/") ? next.path : `/${next.path}`;
      anchor = next.hash || anchor;
    }
    if (patterns.some((pattern) => pattern.test(trimSlashes(route))))
      return null;
    const key = routeKey(route);
    const page = routes.get(key);
    if (page) {
      if (
        anchor &&
        !page.anchors.has(anchor) &&
        !page.anchors.has(anchor.toLowerCase())
      )
        return `has no #${anchor} heading or id on /${key}`;
      return null;
    }
    const file = trimSlashes(route);
    if (published.has(file)) return null;
    if ([file, `${file}.mdx`, `${file}.md`].some((name) => ignored.has(name)))
      return "is excluded by .mintignore";
    return "does not exist";
  }

  function checkSiteLink(url, base, where) {
    if (!url || url.startsWith("#") || isExternal(url) || url.includes("{"))
      return;
    linkCount++;
    let parts;
    try {
      parts = splitUrl(url);
    } catch {
      problems.push(`${where}: ${url} has malformed percent-encoding`);
      return;
    }
    let target = parts.path;
    if (!target.startsWith("/")) {
      target = posix.join(base, target);
      if (target === ".." || target.startsWith("../")) {
        problems.push(`${where}: ${url} points outside the documentation`);
        return;
      }
      target = `/${target}`;
    }
    const reason = resolveSite(target, parts.hash);
    if (reason) problems.push(`${where}: ${url} ${reason}`);
  }

  // Navigation pages exist, are published, and do not repeat a route.
  const navigated = new Map();
  for (const entry of validateNavigation(site.navigation)) {
    const key = routeKey(entry);
    if (navigated.has(key))
      problems.push(
        `${configLabel} navigation: ${entry} and ${navigated.get(key)} are both /${key}`,
      );
    navigated.set(key, entry);
    // Mintlify generates OpenAPI operation pages such as "GET /tasks".
    if (pages.has(entry) || openapiOperation.test(entry)) continue;
    problems.push(
      `${configLabel} navigation: ${entry} ${
        ignored.has(`${entry}.mdx`) || ignored.has(`${entry}.md`)
          ? "is excluded by .mintignore"
          : `has no ${entry}.mdx page`
      }`,
    );
  }
  const standalone = new Set();
  for (const entry of content.standalone) {
    standalone.add(routeKey(entry));
    if (!pages.has(trimSlashes(entry)))
      problems.push(
        `${configLabel} content.standalone: ${entry} has no page file`,
      );
  }

  const { compile } = await import("@mdx-js/mdx");
  for (const page of allPages) {
    const where = display(page.path);
    try {
      await compile(
        blank(page.text.slice(0, page.meta.length)) +
          page.text.slice(page.meta.length),
        { format: page.rel.endsWith(".md") ? "md" : "mdx" },
      );
    } catch (error) {
      const reason = error.reason ?? error.message;
      const start = error.place?.start ?? error.place;
      const [line, column] = start?.line
        ? [start.line, start.column]
        : (reason.match(/\((\d+):(\d+)/)?.slice(1) ?? [1]);
      problems.push(
        `${where}:${line}${column ? `:${column}` : ""}: does not compile as MDX: ${reason}`,
      );
    }
    if (!page.snippet) {
      for (const field of ["title", "description"]) {
        const value = page.meta.data?.[field]?.value;
        if (typeof value !== "string" || !value.trim())
          problems.push(`${where}:1: frontmatter needs a ${field}`);
      }
      const key = routeKey(page.id);
      if (key && !navigated.has(key) && !standalone.has(key))
        problems.push(
          `${where}: /${key} is not in navigation; add it, list it in content.standalone, or delete it and add a redirect`,
        );
      const icon = page.meta.data?.icon;
      if (typeof icon?.value === "string" && icon.value.startsWith("/"))
        checkSiteLink(
          icon.value,
          posix.dirname(page.rel),
          `${where}:${page.line(icon.offset)}`,
        );
    }
    for (const link of links(page.body))
      checkSiteLink(
        link.url,
        posix.dirname(page.rel),
        `${where}:${page.line(link.index)}`,
      );
  }

  for (const link of configLinks(site))
    checkSiteLink(link.url, "", `${configLabel} ${link.path}`);

  for (const rel of tree.files.filter((file) => file.endsWith(".css"))) {
    const path = resolve(root, rel);
    const text = await readFile(path, "utf8");
    const line = lineIndex(text);
    for (const match of text
      .replace(/\/\*[\s\S]*?\*\//g, blank)
      .matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)\s"']*))\s*\)/g)) {
      const url = match[1] ?? match[2] ?? match[3];
      if (url.startsWith("data:")) continue;
      checkSiteLink(
        url,
        posix.dirname(rel),
        `${display(path)}:${line(match.index)}`,
      );
    }
  }

  if (content.screenshots) {
    const where = display(content.screenshots);
    let manifest;
    try {
      manifest = JSON.parse(await readFile(content.screenshots, "utf8"));
    } catch (error) {
      problems.push(
        `${where}: ${error.code === "ENOENT" ? "does not exist" : error.message}`,
      );
    }
    const entries = manifest?.screenshots;
    if (manifest && !Array.isArray(entries))
      problems.push(`${where}: needs a screenshots list`);
    const listed = new Set();
    for (const [index, entry] of (Array.isArray(entries)
      ? entries
      : []
    ).entries()) {
      const at = `${where} screenshots[${index}]`;
      const scale = entry?.scale ?? 1;
      if (
        !Number.isInteger(entry?.width) ||
        !Number.isInteger(entry?.height) ||
        entry.width <= 0 ||
        entry.height <= 0 ||
        typeof scale !== "number" ||
        scale <= 0 ||
        typeof entry.light !== "string" ||
        (entry.dark !== undefined && typeof entry.dark !== "string")
      ) {
        problems.push(
          `${at}: needs light, optional dark, positive integer width and height, and an optional positive scale`,
        );
        continue;
      }
      const width = Math.round(entry.width * scale);
      const height = Math.round(entry.height * scale);
      for (const theme of ["light", "dark"]) {
        if (entry[theme] === undefined) continue;
        const file = trimSlashes(entry[theme]);
        if (listed.has(file))
          problems.push(`${at}.${theme}: ${file} is listed twice`);
        listed.add(file);
        if (!published.has(file)) {
          problems.push(
            `${at}.${theme}: ${entry[theme]} ${ignored.has(file) ? "is excluded by .mintignore" : "does not exist"}`,
          );
          continue;
        }
        imageCount++;
        try {
          const actual = imageDimensions(await readFile(resolve(root, file)));
          if (actual.width !== width || actual.height !== height)
            problems.push(
              `${at}.${theme}: ${entry[theme]} is ${actual.width}x${actual.height}, expected ${width}x${height}`,
            );
        } catch (error) {
          problems.push(`${at}.${theme}: ${entry[theme]}: ${error.message}`);
        }
      }
    }
  }

  // Repository Markdown outside the published site: links resolve on disk.
  const checked = new Set(allPages.map((page) => page.path));
  const exclude = createIgnore(content.exclude);
  for (const markdownRoot of content.markdown) {
    const { files } = await walk(markdownRoot, {
      skip: (rel, name) =>
        outputDirectories.has(name) ||
        name.startsWith("test-results-") ||
        exclude(rel, true),
      ignore: (rel) => exclude(rel),
    });
    for (const rel of files) {
      const path = resolve(markdownRoot, rel);
      if (!pageExtensions.has(extname(rel)) || checked.has(path)) continue;
      checked.add(path);
      const text = (await readFile(path, "utf8")).replace(/\r\n?/g, "\n");
      const line = lineIndex(text);
      const base = isInside(root, path) ? root : markdownRoot;
      for (const link of links(prose(text, frontmatter(text).length).body)) {
        const { url } = link;
        if (!url || url.startsWith("#") || isExternal(url) || url.includes("{"))
          continue;
        linkCount++;
        const where = `${display(path)}:${line(link.index)}`;
        let target;
        try {
          target = splitUrl(url).path;
        } catch {
          problems.push(`${where}: ${url} has malformed percent-encoding`);
          continue;
        }
        if (!target) continue;
        target = target.startsWith("/")
          ? resolve(base, `.${target}`)
          : resolve(dirname(path), target);
        let found = false;
        for (const candidate of [target, `${target}.mdx`, `${target}.md`]) {
          try {
            await stat(candidate);
            found = true;
            break;
          } catch (error) {
            if (error.code !== "ENOENT" && error.code !== "ENOTDIR")
              throw error;
          }
        }
        if (!found) problems.push(`${where}: ${url} does not exist`);
      }
    }
  }

  return {
    problems,
    pages: allPages.filter((page) => !page.snippet).length,
    links: linkCount,
    images: imageCount,
  };
}
