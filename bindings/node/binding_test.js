const assert = require("node:assert");
const { test } = require("node:test");
const RegexReplacement = require(".");

test("loads the grammar through the Node-API binding", () => {
  assert.strictEqual(RegexReplacement.name, "regex_replacement");
  assert.ok(RegexReplacement.language);
  assert.ok(Array.isArray(RegexReplacement.nodeTypeInfo));
});
