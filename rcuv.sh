#!/bin/bash
node ./index.js -i ../rcuv-usfm/res/RCUV_USFM/ -e -l zh-Hant
./output/epub/output.epub ./rcuv.epub --chapter "/" --page-breaks-before "//h:div[@class=\"page-break\"]"
kindlegen ./rcuv.epub
