#!/bin/sh

{
  curl 'https://www.bundesnetzagentur.de/_tools/SVG/js2/_functions/csv_export.html?view=renderCSV&id=870304' |
  tr -d '\r'
  echo
} | grep . >daten.csv
