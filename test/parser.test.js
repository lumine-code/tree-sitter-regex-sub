const assert = require("node:assert");
const { test } = require("node:test");
const Parser = require("tree-sitter");
const RegexReplacement = require("..");

function parse(source) {
  const parser = new Parser();
  parser.setLanguage(RegexReplacement);
  return parser.parse(source);
}

test("parses substitutions and escapes without errors", () => {
  const tree = parse("before-$1-$01-$99-$&-$`-$'-$$-\\n-after");
  assert.strictEqual(tree.rootNode.hasError, false);
  assert.deepStrictEqual(
    tree.rootNode.descendantsOfType("capture_reference").map((node) => node.text),
    ["$1", "$01", "$99"],
  );
  assert.deepStrictEqual(
    tree.rootNode.descendantsOfType("match_reference").map((node) => node.text),
    ["$&", "$`", "$'"],
  );
  assert.deepStrictEqual(
    tree.rootNode.descendantsOfType("dollar_escape").map((node) => node.text),
    ["$$"],
  );
  assert.deepStrictEqual(
    tree.rootNode.descendantsOfType("escape_sequence").map((node) => node.text),
    ["\\n"],
  );
});

test("keeps unsupported dollar forms literal", () => {
  const tree = parse("$0 $00 \\$ $x $");
  assert.strictEqual(tree.rootNode.hasError, false);
  assert.strictEqual(tree.rootNode.descendantsOfType("capture_reference").length, 0);
  assert.strictEqual(tree.rootNode.descendantsOfType("match_reference").length, 0);
  assert.strictEqual(tree.rootNode.descendantsOfType("escape_sequence").length, 0);
});

test("limits a numeric capture reference to two digits", () => {
  const tree = parse("$100");
  assert.strictEqual(tree.rootNode.hasError, false);
  assert.deepStrictEqual(
    tree.rootNode.namedChildren.map((node) => [node.type, node.text]),
    [
      ["capture_reference", "$10"],
      ["text", "0"],
    ],
  );
});
