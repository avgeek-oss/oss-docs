function globToRegex(glob) {
  let source = "";
  for (let index = 0; index < glob.length; index++) {
    const char = glob[index];
    if (char === "*" && glob[index + 1] === "*") {
      const before = index === 0 || glob[index - 1] === "/";
      const after = glob[index + 2];
      if (before && after === "/") {
        source += "(?:.*/)?";
        index += 2;
      } else {
        source += ".*";
        index += 1;
      }
    } else if (char === "*") source += "[^/]*";
    else if (char === "?") source += "[^/]";
    else if (char === "\\" && index + 1 < glob.length)
      source += glob[++index].replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
    else if (char === "[") {
      const end = glob.indexOf("]", index + 1);
      if (end === -1) source += "\\[";
      else {
        source += `[${glob.slice(index + 1, end).replace(/^!/, "^")}]`;
        index = end;
      }
    } else source += char.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
  }
  return new RegExp(`^${source}$`);
}

// A gitignore-style matcher for .mintignore and content.exclude patterns.
// Paths are POSIX paths relative to the directory that owns the patterns.
export function createIgnore(patterns) {
  const rules = [];
  for (let line of patterns) {
    line = line.trim();
    if (!line || line.startsWith("#")) continue;
    const negate = line.startsWith("!");
    if (negate) line = line.slice(1);
    const directoryOnly = line.endsWith("/");
    line = line.replace(/\/+$/, "");
    const anchored = line.includes("/");
    line = line.replace(/^\/+/, "");
    if (line)
      rules.push({ negate, directoryOnly, anchored, regex: globToRegex(line) });
  }
  return function ignores(path, isDirectory = false) {
    const parts = path.split("/").filter(Boolean);
    for (let depth = 1; depth <= parts.length; depth++) {
      const directory = depth < parts.length || isDirectory;
      const partial = parts.slice(0, depth).join("/");
      let ignored = false;
      for (const rule of rules) {
        if (rule.directoryOnly && !directory) continue;
        if (rule.regex.test(rule.anchored ? partial : parts[depth - 1]))
          ignored = !rule.negate;
      }
      if (ignored) return true;
    }
    return false;
  };
}
