# tree-sitter-regex-sub

Parses regular-expression replacement templates with Tree-sitter.

## Features

- **Grammars**: provides Tree-sitter grammars.
- **Capture references**: recognizes numeric substitutions from `$1` through `$99`.
- **Match references**: recognizes `$&`, `` $` ``, and `$'` substitutions.
- **Escapes**: distinguishes `$$` and backslash escape sequences from literal text.
- **Bindings**: supports Node-API, source, and WebAssembly builds.

## Installation

```sh
npm install tree-sitter @lumine-code/tree-sitter-regex-sub
```

## Usage

```js
const Parser = require("tree-sitter");
const RegexReplacement = require("@lumine-code/tree-sitter-regex-sub");

const parser = new Parser();
parser.setLanguage(RegexReplacement);
const tree = parser.parse("before-$1-after");
```

## Building

```sh
npm install
npm test
npm run build:wasm
```

## Contributing

Got ideas to make this package better, found a bug, or want to help add new features? Just drop your thoughts on GitHub. Any feedback is welcome!
