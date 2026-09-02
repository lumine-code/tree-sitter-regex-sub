module.exports = grammar({
  name: "regex_replacement",

  extras: () => [],

  rules: {
    document: ($) =>
      repeat(
        choice($.capture_reference, $.match_reference, $.dollar_escape, $.escape_sequence, $.text),
      ),

    capture_reference: () => /\$(?:[1-9][0-9]?|0[1-9])/,
    match_reference: () => choice("$&", "$`", "$'"),
    dollar_escape: () => "$$",
    escape_sequence: () => /\\[^\r\n$]/,
    text: () => token(prec(-1, /[^$\\]+|[$\\]/)),
  },
});
