const assert = require("node:assert/strict");

function point(source, index) {
  const prefix = source.slice(0, index);
  return { row: prefix.split("\n").length - 1, column: index - prefix.lastIndexOf("\n") - 1 };
}

module.exports = (test, createParser) => {
  test("recognizes numeric and named captures with the same reference node", () => {
    const parser = createParser();
    try {
      const tree = parser.parse("$1 $01 $99 $100 $<name> $<zażółć> $<> $<name with spaces>");
      assert.equal(tree.rootNode.hasError, false);
      assert.deepStrictEqual(
        tree.rootNode.descendantsOfType("capture_reference").map((node) => node.text),
        ["$1", "$01", "$99", "$10", "$<name>", "$<zażółć>", "$<>", "$<name with spaces>"],
      );
      tree.delete?.();
    } finally {
      parser.delete?.();
    }
  });

  test("batches NUL and Unicode text and preserves literal and escaped references", () => {
    const parser = createParser();
    try {
      const source = "α😀\0text $0 $00 $x \\$1 \\n $$ $& $` $'";
      const tree = parser.parse(source);
      assert.equal(tree.rootNode.hasError, false);
      assert.equal(tree.rootNode.namedChild(0).text, "α😀\0text ");
      assert.deepStrictEqual(
        tree.rootNode.descendantsOfType("capture_reference").map((node) => node.text),
        ["$1"],
      );
      assert.deepStrictEqual(
        tree.rootNode.descendantsOfType("escape_sequence").map((node) => node.text),
        ["\\n"],
      );
      tree.delete?.();
    } finally {
      parser.delete?.();
    }
  });

  test("scans incomplete named references in linear work", () => {
    const parser = createParser();
    try {
      for (const count of [1024, 8192]) {
        const source = "$<name ".repeat(count) + "$1";
        let consumed = 0;
        parser.setLogger((message) => {
          if (message === "consume" || message.startsWith("consume ")) consumed++;
        });
        const tree = parser.parse(source);
        parser.setLogger(null);
        assert.equal(tree.rootNode.hasError, false);
        assert.deepStrictEqual(
          tree.rootNode.descendantsOfType("capture_reference").map((node) => node.text),
          ["$1"],
        );
        assert.ok(
          consumed < source.length * 5,
          `${consumed} consumes for ${source.length} characters`,
        );
        tree.delete?.();
      }
    } finally {
      parser.setLogger(null);
      parser.delete?.();
    }
  });

  test("invalidates the missing named terminator cache after edits", () => {
    const parser = createParser();
    try {
      for (const [source, index, length, inserted] of [
        ["$<name", 6, 0, ">"],
        ["$<name>", 6, 1, ""],
        ["$<a\n$<b", 7, 0, ">"],
        ["$<name ".repeat(65) + "$1", 455, 0, ">"],
      ]) {
        const old = parser.parse(source);
        const changed = source.slice(0, index) + inserted + source.slice(index + length);
        old.edit({
          startIndex: index,
          oldEndIndex: index + length,
          newEndIndex: index + inserted.length,
          startPosition: point(source, index),
          oldEndPosition: point(source, index + length),
          newEndPosition: point(changed, index + inserted.length),
        });
        const incremental = parser.parse(changed, old);
        const fresh = parser.parse(changed);
        const shape = (tree) =>
          tree.rootNode.namedChildren.map((node) => [
            node.type,
            node.startIndex,
            node.endIndex,
            node.text,
          ]);
        assert.equal(incremental.rootNode.hasError, false);
        assert.deepStrictEqual(shape(incremental), shape(fresh));
        old.delete?.();
        incremental.delete?.();
        fresh.delete?.();
      }
    } finally {
      parser.delete?.();
    }
  });

  test("keeps references and missing-terminator state inside their included ranges", () => {
    const parser = createParser();
    const ranges = (source, parts) => {
      let offset = 0;
      return parts.map((part) => {
        const startIndex = source.indexOf(part, offset);
        const endIndex = startIndex + part.length;
        offset = endIndex;
        return {
          startIndex,
          endIndex,
          startPosition: point(source, startIndex),
          endPosition: point(source, endIndex),
        };
      });
    };
    try {
      for (const [source, parts, references] of [
        ["$<first ignored $<second>", ["$<first", "$<second>"], ["$<second>"]],
        ["$1 ignored 2", ["$1", "2"], ["$1"]],
        ["$ ignored & \\ ignored n", ["$", "&", "\\", "n"], []],
        ["$<a gap >", ["$<a", ">"], []],
      ]) {
        const tree = parser.parse(source, null, { includedRanges: ranges(source, parts) });
        assert.equal(tree.rootNode.hasError, false);
        assert.deepStrictEqual(
          tree.rootNode.descendantsOfType("capture_reference").map((node) => node.text),
          references,
        );
        assert.equal(tree.rootNode.descendantsOfType("match_reference").length, 0);
        assert.equal(tree.rootNode.descendantsOfType("escape_sequence").length, 0);
        tree.delete?.();
      }
      const source = "$<a x gap $<b>";
      const old = parser.parse(source, null, { includedRanges: ranges(source, ["$<a x", "$<b>"]) });
      const changed = source.slice(0, 5) + ">" + source.slice(5);
      old.edit({
        startIndex: 5,
        oldEndIndex: 5,
        newEndIndex: 6,
        startPosition: point(source, 5),
        oldEndPosition: point(source, 5),
        newEndPosition: point(changed, 6),
      });
      const options = { includedRanges: ranges(changed, ["$<a x>", "$<b>"]) };
      const incremental = parser.parse(changed, old, options);
      const fresh = parser.parse(changed, null, options);
      const references = (tree) =>
        tree.rootNode
          .descendantsOfType("capture_reference")
          .map((node) => [node.text, node.startIndex, node.endIndex]);
      assert.deepStrictEqual(references(incremental), references(fresh));
      assert.deepStrictEqual(
        references(incremental).map(([text]) => text),
        ["$<a x>", "$<b>"],
      );
      old.delete?.();
      incremental.delete?.();
      fresh.delete?.();
    } finally {
      parser.delete?.();
    }
  });

  test("reuses bounded token groups when editing large replacement templates", () => {
    const parser = createParser();
    try {
      const count = 8193;
      const source = "a$1".repeat(count);
      for (const index of [0, Math.floor(count / 2) * 3, source.length - 3]) {
        const old = parser.parse(source);
        old.edit({
          startIndex: index,
          oldEndIndex: index + 1,
          newEndIndex: index + 1,
          startPosition: point(source, index),
          oldEndPosition: point(source, index + 1),
          newEndPosition: point(source, index + 1),
        });
        let processed = 0;
        parser.setLogger((message) => {
          if (message === "process" || message.startsWith("process ")) processed++;
        });
        const incremental = parser.parse(
          source.slice(0, index) + "b" + source.slice(index + 1),
          old,
        );
        parser.setLogger(null);
        assert.equal(incremental.rootNode.hasError, false);
        assert.equal(incremental.rootNode.descendantsOfType("capture_reference").length, count);
        assert.ok(processed < count / 8, `${processed} process steps`);
        incremental.delete?.();
        old.delete?.();
      }
    } finally {
      parser.setLogger(null);
      parser.delete?.();
    }
  });
};
