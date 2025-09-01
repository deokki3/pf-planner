module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    env: { node: true, es2021: true },
    plugins: ['@typescript-eslint'],
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
    rules: { // Unexpected any. Specify a different type 문구 제거
        "@typescript-eslint/no-explicit-any": "off", 
        // React, { ReactElement } from "react" 설정 안함
        "@typescript-eslint/explicit-module-boundary-types": "off",
      },
  };