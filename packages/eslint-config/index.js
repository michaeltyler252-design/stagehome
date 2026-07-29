/** Shared ESLint baseline for all apps/packages in the monorepo. */
module.exports = {
  root: true,
  env: { node: true, es2022: true },
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  rules: {
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
  },
  ignorePatterns: ["dist", ".next", "node_modules"],
};
