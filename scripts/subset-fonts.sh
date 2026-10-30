#!/usr/bin/env bash
# Re-creates the self-hosted, subset WOFF2 files in public/fonts from @fontsource.
# Needs: pip install fonttools brotli
# Subset = ASCII + Latin-1 (Spanish accents) + typographic punctuation, arrows, check mark.
set -euo pipefail
cd "$(dirname "$0")/.."
UNICODES="U+0020-007E,U+00A0-00FF,U+2013-2014,U+2018-201D,U+2022,U+2026,U+2190-2192,U+21C6,U+2713,U+2122"
for src in \
  node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-800-italic.woff2 \
  node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-700-normal.woff2 \
  node_modules/@fontsource/barlow/files/barlow-latin-400-normal.woff2 \
  node_modules/@fontsource/barlow/files/barlow-latin-500-normal.woff2 \
  node_modules/@fontsource/barlow/files/barlow-latin-600-normal.woff2 \
  node_modules/@fontsource/barlow/files/barlow-latin-700-normal.woff2; do
  pyftsubset "$src" --unicodes="$UNICODES" --flavor=woff2 --layout-features='kern,liga' \
    --no-hinting --desubroutinize --output-file="public/fonts/$(basename "$src")"
done
ls -la public/fonts
