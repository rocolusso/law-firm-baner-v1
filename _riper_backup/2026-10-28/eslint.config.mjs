import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  prettier,
  { ignores: [".next/**", "out/**", "node_modules/**", "next-env.d.ts"] },
];

export default eslintConfig;
