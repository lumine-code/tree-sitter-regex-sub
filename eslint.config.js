const js = require("@eslint/js");
const globals = require("globals");
const eslintConfigPrettier = require("eslint-config-prettier");

module.exports = [
  {
    ignores: ["build/**", "node_modules/**", "src/**"],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "commonjs",
      globals: {
        ...globals.node,
        grammar: "readonly",
        choice: "readonly",
        repeat: "readonly",
        token: "readonly",
        prec: "readonly",
      },
    },
  },
  eslintConfigPrettier,
];
