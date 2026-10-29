/** Splices a generated JSON list into navigation: `file.json` or `file.json#/pointer`. */
export type NavigationInclude = { $include: string };
export type PageGroup = {
  group: string;
  icon?: string;
  pages: (string | PageGroup | NavigationInclude)[] | NavigationInclude;
};
export type Category = { dropdown: string; icon?: string; groups: PageGroup[] };
/** Copies `from` (relative to site.json) to `to` (relative to the content directory). */
export type SiteAsset = { from: string; to: string };
export type ContentOptions = {
  /** Pages published outside navigation, such as legal pages. */
  standalone?: string[];
  /** Directories, relative to site.json, whose Markdown links are checked on disk. */
  markdown?: string[];
  /** Gitignore-style patterns excluded from the `markdown` directories. */
  exclude?: string[];
  /** Screenshot manifest, relative to site.json. */
  screenshots?: string;
};
export type SiteConfig = {
  name: string;
  colors: { primary: string; light: string; dark: string };
  navigation: { dropdowns: Category[]; [key: string]: unknown };
  navbar: {
    primary: { href: string; label?: string; type?: string };
    [key: string]: unknown;
  };
  footer: {
    links: { header: string; items: { label: string; href: string }[] }[];
    socials?: Record<string, string>;
    [key: string]: unknown;
  };
  assets?: SiteAsset[];
  /** package.json for `{version}`, relative to site.json; defaults to the nearest one. */
  packageJson?: string;
  content?: ContentOptions;
  [key: string]: unknown;
};
/** The exact docs.json configuration, without tooling keys. */
export type DocsConfig = Omit<SiteConfig, "assets" | "packageJson" | "content">;
export type LoadedSite = {
  /** Absolute path of site.json. */
  config: string;
  site: DocsConfig;
  /** `from` is absolute; `to` is relative to the content directory. */
  assets: SiteAsset[];
  content: {
    standalone: string[];
    markdown: string[];
    exclude: string[];
    screenshots?: string;
  };
};
export type SiteOptions = {
  /** Path to site.json. */
  config: string;
  /** Mintlify content directory that receives the generated files. */
  dir: string;
};
export type ContentReport = {
  /** Every problem found, as `location: message` lines. */
  problems: string[];
  pages: number;
  links: number;
  images: number;
};
export type CheckResult = {
  files: string[];
  pages?: number;
  links?: number;
  images?: number;
};

export declare const siteDefaults: Readonly<Record<string, unknown>>;
export declare const toolingKeys: readonly ["assets", "packageJson", "content"];
/** The Mintlify CLI version `validateSite` runs. */
export declare const mintVersion: string;

export declare function defineSite(input: SiteConfig): DocsConfig;
export declare function validateNavigation(
  navigation: SiteConfig["navigation"],
): string[];
/** Reads site.json, resolving navigation includes and `{version}`. */
export declare function loadSite(config: string): Promise<LoadedSite>;
/** Writes the generated files and assets; returns their paths. With `check`, throws on drift instead. */
export declare function syncSite(
  options: SiteOptions & { check?: boolean },
): Promise<string[]>;
/** Checks generated files and, with `content`, the published content. Throws a SiteCheckError listing every problem. */
export declare function checkSite(
  options: SiteOptions & { content?: boolean },
): Promise<CheckResult>;
/** Returns every content problem instead of throwing. */
export declare function checkContent(
  options: SiteOptions | { dir: string; loaded: LoadedSite },
): Promise<ContentReport>;
/** Runs the pinned `mint validate`, `broken-links` and `a11y` checks in `dir`. */
export declare function validateSite(options: {
  dir: string;
  run?: (args: string[], options: { cwd: string }) => Promise<number>;
}): Promise<string[]>;
export declare function imageDimensions(image: Buffer): {
  format: "png" | "jpeg" | "svg";
  width: number;
  height: number;
};
export declare class SiteCheckError extends Error {
  problems: string[];
}
