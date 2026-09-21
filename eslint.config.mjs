import canvaPlugin from "@canva/app-eslint-plugin";

export default [
  {
    ignores: [
      "**/node_modules/",
      "**/dist",
      "**/*.d.ts",
      "**/*.d.tsx",
      "**/*.config.*",
      ".agents/**",
      ".claude/**",
      ".codex/**",
    ],
  },
  ...canvaPlugin.configs.apps,
  {
    rules: {
      // This app ships in English only. Canva's public-app review expects
      // react-intl, so turn these back on and wrap the UI strings in
      // FormattedMessage before submitting it to the marketplace.
      "formatjs/no-literal-string-in-jsx": "off",
      "formatjs/no-literal-string-in-object": "off",
    },
  },
];
