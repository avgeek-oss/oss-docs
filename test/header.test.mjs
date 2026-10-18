import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
const source = await readFile(
  new URL("../assets/header.js", import.meta.url),
  "utf8",
);

test("header preserves native controls and destination semantics across rerenders", async () => {
  const dom = new JSDOM(
    `<body><header id="navbar"><a href="/"><img class="nav-logo" alt="Example" /></a><div><div><button id="theme-preference-menu-trigger">Theme</button></div></div><div id="topbar-cta-button"><a href="https://example.test/docs" target="_blank" rel="noopener">Docs</a></div><button id="search-bar-entry">Search</button></header><footer id="footer"><a href="/"><img class="nav-logo" alt="Example" /></a></footer></body>`,
    { runScripts: "outside-only", pretendToBeVisual: true },
  );
  try {
    const { window } = dom;
    const run = () =>
      window.eval(
        source.replace(
          "__OSS_DOCS_SETTINGS__",
          JSON.stringify({ name: "Example" }),
        ),
      );
    const tick = () =>
      new Promise((resolve) =>
        window.requestAnimationFrame(() =>
          window.requestAnimationFrame(resolve),
        ),
      );
    run();
    await tick();
    const primary = window.document.querySelector("[data-oss-primary]");
    assert.equal(primary.textContent, "Docs");
    assert.equal(primary.target, "_blank");
    assert.equal(primary.rel, "noopener");
    assert.equal(
      window.document.querySelector("[data-oss-wordmark]").textContent,
      "Example",
    );
    assert(window.document.querySelector("#search-bar-entry"));
    run();
    await tick();
    assert.equal(
      window.document.querySelectorAll("[data-oss-primary]").length,
      1,
    );
    assert.equal(
      window.document.querySelectorAll("#footer [data-oss-wordmark]").length,
      1,
    );
    assert.equal(
      window.document.querySelector("#footer [data-oss-wordmark]").textContent,
      "Example",
    );
    const native = window.document.querySelector("#topbar-cta-button a");
    native.href = "/new-guide";
    await tick();
    assert.equal(
      window.document.querySelector("[data-oss-primary]").target,
      "",
    );
    // A native rerender creates a child-list mutation, as Mintlify navigation does.
    native.append(window.document.createTextNode(" now"));
    await tick();
    assert.equal(
      window.document.querySelector("[data-oss-primary]").getAttribute("href"),
      "/new-guide",
    );
  } finally {
    dom.window.__ossDocsHeaderCleanup?.();
    dom.window.close();
  }
});

test("footer repository labels preserve social destinations across rerenders", async () => {
  const dom = new JSDOM(
    `<body><footer id="footer"><a href="https://github.com/example/project" target="_blank" rel="noopener noreferrer"><span class="sr-only">github</span><svg></svg></a><a href="https://github.com/example/project">GitHub Source</a></footer></body>`,
    { runScripts: "outside-only", pretendToBeVisual: true },
  );
  try {
    const { window } = dom;
    window.eval(
      source.replace(
        "__OSS_DOCS_SETTINGS__",
        JSON.stringify({ name: "Example" }),
      ),
    );
    const tick = () =>
      new Promise((resolve) =>
        window.requestAnimationFrame(() =>
          window.requestAnimationFrame(resolve),
        ),
      );
    await tick();
    const link = window.document.querySelector("#footer a");
    assert.equal(
      link.querySelector("[data-oss-repository]").textContent,
      "example/project",
    );
    assert.equal(link.target, "_blank");
    assert.equal(link.rel, "noopener noreferrer");
    assert.equal(
      window.document.querySelectorAll("[data-oss-repository]").length,
      1,
    );
    link.href = "https://github.com/example/renamed";
    await tick();
    assert.equal(
      link.querySelector("[data-oss-repository]").textContent,
      "example/renamed",
    );
    link.querySelector("[data-oss-repository]").remove();
    await tick();
    assert.equal(
      window.document.querySelectorAll("[data-oss-repository]").length,
      1,
    );
    assert.equal(
      link.querySelector("[data-oss-repository]").textContent,
      "example/renamed",
    );
  } finally {
    dom.window.__ossDocsHeaderCleanup?.();
    dom.window.close();
  }
});
