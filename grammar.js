module.exports = grammar({
  name: "regex_replacement",

  extras: () => [],

  externals: ($) => [
    $.capture_reference,
    $.match_reference,
    $.dollar_escape,
    $.escape_sequence,
    $.text,
    $._error_sentinel,
  ],

  rules: {
    document: ($) => repeat($._tokens_64),

    _tokens_64: ($) =>
      prec.right(seq($._tokens_8, ...Array.from({ length: 7 }, () => optional($._tokens_8)))),

    _tokens_8: ($) =>
      prec.right(seq($._token, ...Array.from({ length: 7 }, () => optional($._token)))),

    _token: ($) =>
      choice($.capture_reference, $.match_reference, $.dollar_escape, $.escape_sequence, $.text),
  },
});
