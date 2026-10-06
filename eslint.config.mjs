import globals from "globals";
export default [
  {
    ignores: [
      "node_modules/**",
      "artifacts/**",
      "examples/site/oss-docs.js",
      "examples/site/snippets/oss/**",
    ],
  },
  {
    files: ["**/*.mjs", "assets/*.js", "snippets/*.jsx"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        ...globals.node,
        ...globals.browser,
        __OSS_DOCS_SETTINGS__: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "error",
      "no-undef": "error",
      "no-debugger": "error",
      eqeqeq: "error",
      "no-empty": "error",
      "no-unreachable": "error",
      "no-constant-condition": "error",
    },
  },
];
