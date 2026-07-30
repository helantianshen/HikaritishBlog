import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Inherited visual/Three.js components consume dynamic third-party data.
      "@typescript-eslint/no-explicit-any": "off",
      // Browser-derived state is intentionally initialized after hydration.
      "react-hooks/set-state-in-effect": "off",
      // Image URLs are user-managed (legacy hosts or RustFS) and often have no
      // known dimensions; the visual layer intentionally renders them as-is.
      "@next/next/no-img-element": "off",
    },
  },
]);

export default eslintConfig;
