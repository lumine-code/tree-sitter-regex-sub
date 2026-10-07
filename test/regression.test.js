const { test } = require("node:test");
const Parser = require("tree-sitter");
const Replacement = require("..");

require("./regression-cases")(test, () => {
  const parser = new Parser();
  parser.setLanguage(Replacement);
  return parser;
});
