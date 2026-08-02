import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // El código usa `any` deliberadamente en catch blocks de API routes
      "@typescript-eslint/no-explicit-any": "off",
      // Scripts legacy usan require() (better-sqlite3)
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-var-requires": "off",
      // Patrón rest-sibling ({ a, ...rest }): no reportar la variable omitida
      "@typescript-eslint/no-unused-vars": [
        "error",
        { ignoreRestSiblings: true, caughtErrors: "none" },
      ],
    },
  },
  {
    // El bot de WhatsApp (Baileys) es código server-side, no React.
    // La librería expone useMultiFileAuthState() que el rule react-hooks marca como falso positivo.
    files: ["src/lib/baileys/**"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
  {
    // Falsos positivos del rule nuevo (v6): marcaría patrones válidos como
    // hidratar estado desde un URL param en mount y resets derivados de estado.
    files: ["src/app/docs/page.tsx"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    // App Router con next/font: la regla no-page-custom-font es de Pages Router
    // y da falso positivo al cargar fuentes en el root layout.
    files: ["src/app/layout.tsx"],
    rules: {
      "@next/next/no-page-custom-font": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "node_modules/**",
    "data/**",
    "auth/**",
    "uploads/**",
    "next-env.d.ts",
    "docs/n8n/utils-current.js",
    "docs/n8n/utils-patched.js",
  ]),
]);

export default eslintConfig;
