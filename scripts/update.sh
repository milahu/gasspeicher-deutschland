#!/usr/bin/env bash

set -eux

./daten.csv.sh

if ! git status --porcelain | grep -q -x '^ M daten.csv'; then
  echo "already up-to-date"
  exit
fi

rm -rf dist/

if ! [ -e node_modules/ ]; then
  pnpm install
fi

npm run build

git add daten.csv dist/

./scripts/git-commit.py --date-as-message --no-edit
