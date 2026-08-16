#!/usr/bin/env bash
set -euo pipefail
for item in '1,27.18096,31.18368' '2,27.19633685418455,31.07725570042919' '3,27.19633685418455,31.07725570042919'; do
  IFS=, read -r id lat lon <<< "$item"
  curl -sS --get 'https://nominatim.openstreetmap.org/reverse' \
    --data-urlencode "lat=$lat" --data-urlencode "lon=$lon" \
    --data-urlencode 'format=jsonv2' --data-urlencode 'addressdetails=1' --data-urlencode 'zoom=10' \
    -H 'User-Agent: 3tshan-water-sources/1.0 (contact project owner)' -H 'Accept-Language: ar,en' \
    | jq -c --arg id "$id" '{id:$id,display_name, country:.address.country, province:(.address.state // .address.province // .address.region // .address.county)}'
  sleep 1
 done
