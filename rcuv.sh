#!/bin/bash
node ./cli.js -i ../rcuv-usfm/res/RCUV_USFM/ -e -l zh-Hant
ebook-convert ./output/epub/output.epub ./rcuv.epub --chapter "/" --page-breaks-before "//h:div[@class=\"page-break\"]"
kindlegen ./rcuv.epub
