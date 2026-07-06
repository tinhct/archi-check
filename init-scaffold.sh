#!/bin/bash

# ArchiCheck Scaffolding Verification Script

echo "ArchiCheck Project Directory Tree:"
echo "================================="

if command -v tree >/dev/null 2>&1; then
  tree -a -I "node_modules|.next|.git"
else
  # Custom fallback using find to display tree including .github but ignoring other noise
  find . -maxdepth 4 \
    -not -path '*/node_modules*' \
    -not -path '*/.next*' \
    -not -path '*/.git/*' \
    -not -name '.git' \
    | sort \
    | sed -e 's/[^\/]*\//|  /g' -e 's/|  \([^|]\)/|-- \1/'
fi
