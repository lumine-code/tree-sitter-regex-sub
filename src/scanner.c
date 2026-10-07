#include "tree_sitter/parser.h"
#include "tree_sitter/alloc.h"

#include <stdbool.h>
#include <stdint.h>

enum TokenType {
  CAPTURE_REFERENCE,
  MATCH_REFERENCE,
  DOLLAR_ESCAPE,
  ESCAPE_SEQUENCE,
  TEXT,
  ERROR_SENTINEL,
};

typedef struct {
  bool missing_named_end;
} Scanner;

static bool digit(int32_t character) {
  return character >= '0' && character <= '9';
}

static bool boundary(TSLexer *lexer) {
  return lexer->eof(lexer) || lexer->is_at_included_range_start(lexer);
}

void *tree_sitter_regex_replacement_external_scanner_create(void) {
  return ts_calloc(1, sizeof(Scanner));
}

void tree_sitter_regex_replacement_external_scanner_destroy(void *payload) {
  ts_free(payload);
}

unsigned tree_sitter_regex_replacement_external_scanner_serialize(void *payload, char *buffer) {
  buffer[0] = ((Scanner *)payload)->missing_named_end ? 1 : 0;
  return 1;
}

void tree_sitter_regex_replacement_external_scanner_deserialize(
  void *payload, const char *buffer, unsigned length
) {
  ((Scanner *)payload)->missing_named_end = length == 1 && buffer[0] == 1;
}

bool tree_sitter_regex_replacement_external_scanner_scan(
  void *payload, TSLexer *lexer, const bool *valid_symbols
) {
  Scanner *scanner = payload;
  if (!scanner || valid_symbols[ERROR_SENTINEL] || lexer->eof(lexer)) return false;
  if (lexer->is_at_included_range_start(lexer)) scanner->missing_named_end = false;

  int32_t first = lexer->lookahead;
  lexer->advance(lexer, false);
  lexer->mark_end(lexer);
  lexer->result_symbol = TEXT;
  if (boundary(lexer)) return true;

  if (first == '$') {
    int32_t next = lexer->lookahead;
    if (next == '$' || next == '&' || next == '`' || next == '\'') {
      lexer->advance(lexer, false);
      lexer->mark_end(lexer);
      lexer->result_symbol = next == '$' ? DOLLAR_ESCAPE : MATCH_REFERENCE;
      return true;
    }
    if (next >= '1' && next <= '9') {
      lexer->advance(lexer, false);
      if (!boundary(lexer) && digit(lexer->lookahead)) lexer->advance(lexer, false);
      lexer->mark_end(lexer);
      lexer->result_symbol = CAPTURE_REFERENCE;
      return true;
    }
    if (next == '0') {
      lexer->advance(lexer, false);
      if (!boundary(lexer) && lexer->lookahead >= '1' && lexer->lookahead <= '9') {
        lexer->advance(lexer, false);
        lexer->mark_end(lexer);
        lexer->result_symbol = CAPTURE_REFERENCE;
      }
      return true;
    }
    if (next == '<' && !scanner->missing_named_end) {
      lexer->advance(lexer, false);
      while (!boundary(lexer) && lexer->lookahead != '>') lexer->advance(lexer, false);
      if (!boundary(lexer) && lexer->lookahead == '>') {
        lexer->advance(lexer, false);
        lexer->mark_end(lexer);
        lexer->result_symbol = CAPTURE_REFERENCE;
      } else {
        // No future opener can succeed without a '>'. Keep the failed scan's
        // dependency lookahead, but emit only '$' so other references stay visible.
        scanner->missing_named_end = true;
      }
      return true;
    }
  } else if (first == '\\') {
    if (lexer->lookahead != '\r' && lexer->lookahead != '\n' && lexer->lookahead != '$') {
      lexer->advance(lexer, false);
      lexer->mark_end(lexer);
      lexer->result_symbol = ESCAPE_SEQUENCE;
    }
    return true;
  }

  while (!boundary(lexer) && lexer->lookahead != '$' && lexer->lookahead != '\\') {
    lexer->advance(lexer, false);
  }
  lexer->mark_end(lexer);
  return true;
}
