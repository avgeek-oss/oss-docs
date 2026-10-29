// Enhance Mintlify's header while retaining its search dialog and theme menu.
(() => {
  // Mintlify can re-run custom scripts during preview updates.
  window.__ossDocsHeaderCleanup?.();
  const settings = {
    name: "Example",
    repository: {
      href: "https://github.com/avgeek-oss/oss-docs",
      label: "avgeek-oss/oss-docs",
    },
  };
  let scheduled = false;
  let frame;
  window.__ossDocsHeaderCleanup = () => {
    observer.disconnect();
    cancelAnimationFrame(frame);
    document.removeEventListener("DOMContentLoaded", schedule);
  };
  const observer = new MutationObserver(schedule);

  // Label the native footer GitHub social link with footer.socials.github.
  const repositoryPath = (href) =>
    new URL(href).pathname.replace(/\/+$/, "").toLowerCase();
  function enhanceFooterRepository() {
    const repository = settings.repository;
    for (const link of document.querySelectorAll(
      '#footer a[href^="https://github.com/"]:has(> svg):has(> .sr-only)',
    )) {
      let label = link.querySelector("[data-oss-repository]");
      if (
        !repository ||
        repositoryPath(link.href) !== repositoryPath(repository.href)
      ) {
        label?.remove();
        continue;
      }
      if (!label) {
        label = document.createElement("span");
        label.dataset.ossRepository = "";
        link.append(label);
      }
      if (label.textContent !== repository.label)
        label.textContent = repository.label;
    }
  }

  function enhanceHeader() {
    observer.disconnect();
    for (const logo of document.querySelectorAll(
      "#navbar a:has(.nav-logo), #footer a:has(.nav-logo)",
    )) {
      if (!logo.querySelector("[data-oss-wordmark]")) {
        const wordmark = document.createElement("span");
        wordmark.dataset.ossWordmark = "";
        wordmark.setAttribute("aria-hidden", "true");
        wordmark.textContent = settings.name;
        logo.append(wordmark);
      }
    }
    enhanceFooterRepository();
    const header = document.getElementById("navbar");
    if (header) {
      const theme = header.querySelector("#theme-preference-menu-trigger");
      const primary = header.querySelector("#topbar-cta-button a");
      const actions = theme?.parentElement?.parentElement;
      const internal = primary?.getAttribute("href")?.startsWith("/");
      const target = internal ? null : primary?.getAttribute("target");
      if (theme && primary && actions) {
        const existing = actions.querySelector("[data-oss-primary]");
        if (
          !existing ||
          existing.getAttribute("href") !== primary.getAttribute("href") ||
          existing.textContent !== primary.textContent ||
          existing.getAttribute("target") !== target ||
          existing.getAttribute("rel") !== primary.getAttribute("rel")
        ) {
          const cta = primary.cloneNode(true);
          cta.dataset.ossPrimary = "";
          if (internal) cta.removeAttribute("target");
          if (existing) existing.replaceWith(cta);
          else actions.append(cta);
        }
        header.dataset.ossEnhanced = "";
      }
    }
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["href", "target", "rel"],
    });
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    frame = requestAnimationFrame(() => {
      scheduled = false;
      enhanceHeader();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", schedule, { once: true });
  } else {
    schedule();
  }
})();
