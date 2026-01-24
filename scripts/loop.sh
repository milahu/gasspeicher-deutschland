#!/usr/bin/env bash

set -ux

while true; do
  date
  ./scripts/update.sh
  git push
  sleep 1h
done
