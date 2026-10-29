import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { parse } from "@babel/parser";
import { compile } from "@mdx-js/mdx";
import { fixturePages } from "./fixtures/site.mjs";

test("shipped snippets obey the Mintlify sandbox and compile in real MDX imports", async () => {
  for (const name of ["homepage", "screenshot"]) {
    const source = await readFile(
      new URL(`../snippets/${name}.jsx`, import.meta.url),
      "utf8",
    );
    const tree = parse(source, { sourceType: "module", plugins: ["jsx"] });
    for (const statement of tree.program.body) {
      assert.equal(statement.type, "ExportNamedDeclaration");
      assert.equal(statement.declaration.type, "VariableDeclaration");
      assert.equal(
        statement.declaration.declarations[0].init.type,
        "ArrowFunctionExpression",
      );
    }
  }
  await compile(fixturePages["index.mdx"]);
  await compile(fixturePages["guide.mdx"]);
});
