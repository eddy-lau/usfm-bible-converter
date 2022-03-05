# rcuv-html-converter

## CLI USAGE

```
  Usage: cli [options]

  Options:

    -V, --version                         output the version number
    -i, --input-bible [input-bible]       default: RCUV
    -o, --output-dir [output_directory]   the output dir of HTML files
    -f, --output-format [output_format]   the output format: html or htmlElement
    -y, --layout [layout]                 the layout of the text, must be "paragraph" or "line"
    -s, --scripture [scripture location]  the location of the scripture. e.g. 列王紀上15：33～16：14
    -b, --book [book name]                the book name to convert e.g. gen
    -h, --help                            output usage information


  Example 1, to convert the whole bible and output the files to the "output" folder:
  $ node cli.js -o output

  Example 2, to convert one book and output to "output" folder:
  $ node cli.js -b gen -o output

  Example 3, to convert part and output to "test" folder:
  $ node cli.js -s 列王紀上15：33～16：14 -o test

  Example 4, to convert part and output to console
  $ node cli.js -s 列王紀上15：33～16：14 -f html

  Example 5, to convert chapter 15 and output to console
  $ node cli.js -s 列王紀上15～ -f html
```

