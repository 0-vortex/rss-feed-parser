module.exports = {
  extends: [
    "airbnb-base/legacy",
    "airbnb-base/whitespace",
  ],
  env: {
    node: true,
    es2021: true
  },
  globals: {
    module: true
  },
  parser: "@babel/eslint-parser",
  parserOptions: {
    babelOptions: {
      plugins: [
        '@babel/plugin-syntax-import-assertions'
      ],
    },
    requireConfigFile: false,
    ecmaVersion: 13,
    ecmaFeatures: {
      impliedStrict: true
    },
    sourceType: "module",
    allowImportExportEverywhere: false
  },
  rules: {
    "no-console": 0,
    "import/no-unresolved": 0,
    "import/extensions": 0,
    "no-restricted-syntax": 0,
    camelcase: [2, {
      allow: [
        "per_page",
        "created_at",
        "anon_key"
      ],
    }]
  }
};
