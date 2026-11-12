import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
 { ignores: ["dist", ".vercel"] },
 {
  ...js.configs.recommended,
  files: ["**/*.{js,jsx}"],
 },
 {
  files: ["**/*.{js,jsx}"],
  languageOptions: {
   ecmaVersion: "latest",
   sourceType: "module",
   globals: globals.browser,
   parserOptions: { ecmaFeatures: { jsx: true } },
  },
  plugins: {
   "react-hooks": reactHooks,
   "react-refresh": reactRefresh,
  },
  rules: {
   ...reactHooks.configs.recommended.rules,
   // Sin eslint-plugin-react, los componentes usados solo en JSX parecen sin usar.
   "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]" }],
   "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
  },
 },
 {
  files: ["*.config.js"],
  languageOptions: { globals: globals.node },
 },
];
