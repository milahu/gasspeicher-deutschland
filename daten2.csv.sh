#!/usr/bin/env bash

set -e
set -u
# set -x # debug

# https://agsi.gie.eu/data-overview/DE

# yeah i know, i should not publish my apikey...
api_key=ef89a7749d67129d7ba29e0548f7fb22

command -v curl
command -v jq
command -v csvformat

#date1=$(date +'%Y-%m-%d' -d '-1month')
#date1=$(date +'%Y-%m-%d' -d '-1year') # 2 pages
date1=$(date +'%Y-%m-%d' -d '-301days')
date2=$(date +'%Y-%m-%d')

curl --header "x-key: $api_key" "https://agsi.gie.eu/api?country=DE&from=$date1&to=$date2&page=1&size=3000" |
jq -r '
  .data
  | map(del(.info))
  | (
      .[0]
      | to_entries
      | map(.key)
    ) as $cols
  | ($cols | @csv),
    (.[] | [to_entries[] | .value] | @csv)
' |
csvformat \
>daten2.csv
