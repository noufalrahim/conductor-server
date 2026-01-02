#!/bin/bash

NAME=$1
FIRST="$(printf "%s" "$NAME" | cut -c1 | tr 'a-z' 'A-Z')"
REST="$(printf "%s" "$NAME" | cut -c2-)"
PASCAL_NAME="${FIRST}${REST}"
KEBAB_NAME="$(printf "%s" "$NAME" | sed 's/\([A-Z]\)/-\1/g' | sed 's/^-//' | tr 'A-Z' 'a-z')"

ENTITY_FILE="${PASCAL_NAME}Entity"
INTERFACE_FILE="I${PASCAL_NAME}Repository"
REPO_IMPL_FILE="${PASCAL_NAME}Repository"
CONTROLLER_FILE="${PASCAL_NAME}Controller"

ENTITY_PATH="../src/domain/entities/${ENTITY_FILE}.ts"
INTERFACE_PATH="../src/domain/repositories/${INTERFACE_FILE}.ts"
REPO_IMPL_PATH="../src/infrastructure/repositories/${REPO_IMPL_FILE}.ts"
CONTROLLER_PATH="../src/controllers/${CONTROLLER_FILE}.ts"
API_PATH="../src/routes/${KEBAB_NAME}.router.ts"

rm -f "$ENTITY_PATH"
rm -f "$INTERFACE_PATH"
rm -f "$REPO_IMPL_PATH"
rm -f "$CONTROLLER_PATH"
rm -f "$API_PATH"

echo "Deleted all files for: ${PASCAL_NAME}"
