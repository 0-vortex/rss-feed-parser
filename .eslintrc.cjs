module.exports = {
  "extends": [
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
  parserOptions: {
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
  }
};
