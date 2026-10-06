export type PageGroup = {
  group: string;
  icon?: string;
  pages: (string | PageGroup)[];
};
export type Category = { dropdown: string; icon?: string; groups: PageGroup[] };
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
    [key: string]: unknown;
  };
  [key: string]: unknown;
};
export declare const siteDefaults: Readonly<Record<string, unknown>>;
export declare function defineSite(input: SiteConfig): SiteConfig;
export declare function validateNavigation(
  navigation: SiteConfig["navigation"],
): string[];
