#!/usr/bin/env bash
# Create a new Power BI Delivery Kit project from the template.
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <project-name>"
  echo "Example: $0 supplier-performance"
  exit 1
fi

NAME="$1"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/projects/_template"
DEST="$ROOT/projects/$NAME"

if [[ -e "$DEST" ]]; then
  echo "Error: $DEST already exists"
  exit 1
fi

cp -R "$SRC" "$DEST"

# Replace placeholder in text files
while IFS= read -r -d '' file; do
  if grep -q '{{PROJECT_NAME}}' "$file" 2>/dev/null; then
    sed -i "s/{{PROJECT_NAME}}/$NAME/g" "$file"
  fi
done < <(find "$DEST" -type f -print0)

mkdir -p "$DEST/inputs"

echo "Created $DEST"
echo "Next: open Cursor Agent and run /pbi-delivery for project '$NAME'"
