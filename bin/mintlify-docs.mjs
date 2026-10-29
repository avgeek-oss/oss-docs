#!/usr/bin/env node
import { realpath } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { checkSite, syncSite, validateSite } from "../src/index.mjs";

// 0.1.x consumers imported syncSite from this file; import it from
// "@avgeek-oss/mintlify-docs" instead.
export { syncSite };

const usage = `Usage:
  mintlify-docs sync --config <site.json> --dir <content directory>
  mintlify-docs check --config <site.json> --dir <content directory> [--content]
  mintlify-docs validate --dir <content directory>`;

export async function main(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      config: { type: "string" },
      dir: { type: "string" },
      content: { type: "boolean", default: false },
    },
  });
  const [command, ...extra] = positionals;
  const needsConfig = command !== "validate";
  if (
    !["sync", "check", "validate"].includes(command) ||
    extra.length ||
    !values.dir ||
    (needsConfig && !values.config) ||
    (values.content && command !== "check")
  )
    throw new Error(usage);
  if (command === "sync") {
    const files = await syncSite({ config: values.config, dir: values.dir });
    console.log(`Generated ${files.length} files in ${values.dir}`);
  } else if (command === "check") {
    const result = await checkSite({
      config: values.config,
      dir: values.dir,
      content: values.content,
    });
    console.log(
      values.content
        ? `Checked ${result.files.length} generated files, ${result.pages} pages, ${result.links} links and ${result.images} ${result.images === 1 ? "screenshot" : "screenshots"} in ${values.dir}`
        : `Checked ${result.files.length} generated files in ${values.dir}`,
    );
  } else {
    await validateSite({ dir: values.dir });
  }
}

if (
  process.argv[1] &&
  (await realpath(resolve(process.argv[1]))) === fileURLToPath(import.meta.url)
) {
  try {
    await main(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
