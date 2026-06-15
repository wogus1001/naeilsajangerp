# CRAWLER KNOWLEDGE BASE

## SCOPE
- Applies to `ERP/crawler`.
- Parent repository rules apply.

## OVERVIEW
- Windows-only OCR/UI automation POC for extracting property-card data from a desktop app.
- Uses pywinauto, win32gui/win32con, PIL image analysis, hand-tuned screen regions, and local Tesseract traineddata.

## STRUCTURE
```text
ERP/crawler/
|-- config.py          # hand-tuned Korean field and checkbox coordinates
|-- run_crawl.py       # hybrid Win32 text + UIA grid + image checkbox extraction
|-- debug_*.py         # inspection and region-debug helpers
|-- test_*.py          # OCR/extraction experiments
|-- crops/             # saved OCR crop references
`-- tessdata/          # local eng/kor traineddata
```

## CONVENTIONS
- Keep stdout UTF-8; Korean field names and OCR output must not be garbled.
- Coordinate edits belong in `config.py`; verify with `debug_regions.py` before trusting extraction.
- Treat crop images and debug screenshots as calibration artifacts, not app assets.
- This subtree is not part of the Next.js `ERP/web` build.

## ANTI-PATTERNS
- Assuming crawler scripts work on macOS; they import Windows-specific modules.
- Replacing tuned coordinates without regenerating/debugging the affected crop.
- Mixing crawler-generated raw data directly into web app state without validation and company scoping.
