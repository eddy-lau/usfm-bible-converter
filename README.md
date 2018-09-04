# rcuv-html-converter

## Convert to EPUB format

```sh
./index.js -i /path/of/usfm/files -e -l zh-Hant
```

## Convert to Mobi

1. Import the EPUB to calibre
1. Selected the book
1. Tap Convert Books
1. Select EPUB format
1. Select Structure detection
1. Under 'Detect chapters at (XPath expression)', input `/`
1. Under 'Insert page breaks before (Xpath expression)', input `//h:div[@class="page-break"]`
1. Press OK
1. Convert the generated EPUB to Mobi by kindlegen
