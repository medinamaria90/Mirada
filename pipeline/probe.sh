#!/usr/bin/env bash
# Consulta temporal (rama probe-giotto): archivos de Commons con buena resolución y obras de Duccio y Simone Martini.
set -u
out=pipeline/probe.txt
: > "$out"
UA='MiradaBot/0.1 (educational; github.com/medinamaria90/mirada)'
q() { echo "== $1" >> "$out"; curl -s -G --max-time 60 -A "$UA" -H 'Accept: text/csv' 'https://query.wikidata.org/sparql' --data-urlencode "query=$2" >> "$out"; echo >> "$out"; }
cs() {  # cs <etiqueta> <búsqueda>: archivos de Commons con medidas, tipo y licencia
  echo "== commons $1" >> "$out"
  curl -s -G --max-time 60 -A "$UA" 'https://commons.wikimedia.org/w/api.php' --data-urlencode action=query --data-urlencode format=json \
    --data-urlencode generator=search --data-urlencode gsrnamespace=6 --data-urlencode "gsrsearch=$2" --data-urlencode gsrlimit=15 \
    --data-urlencode prop=imageinfo --data-urlencode 'iiprop=size|mime|extmetadata' --data-urlencode 'iiextmetadatafilter=LicenseShortName|Artist|Credit' \
    | python3 -c '
import json,sys,re
d=json.load(sys.stdin).get("query",{}).get("pages",{})
for p in d.values():
    i=(p.get("imageinfo") or [{}])[0]; m=i.get("extmetadata",{})
    g=lambda k: re.sub("<[^>]+>","",m.get(k,{}).get("value",""))[:80].replace("\n"," ")
    print("\t".join([p["title"][5:], str(i.get("width")), str(i.get("height")), i.get("mime",""), g("LicenseShortName"), g("Artist"), g("Credit")]))
' >> "$out"
}
cs juicio 'Giotto Last Judgment Scrovegni'
cs juicio2 'Giotto Giudizio universale Scrovegni'
cs sanmarco 'Angelico San Marco Altarpiece'
cs sanmarco2 'Pala di San Marco Beato Angelico'
cs maesta 'Duccio Maestà front Siena'
cs maesta2 'Duccio Maesta Museo dell Opera'
cs smmaesta 'Simone Martini Maestà Palazzo Pubblico'
cs guido 'Guidoriccio da Fogliano'
cs ludovico 'Simone Martini San Ludovico di Tolosa'
q duccio 'SELECT ?w ?le ?les ?sl ?img WHERE { ?w wdt:P170 wd:Q15792 . ?w wikibase:sitelinks ?sl . OPTIONAL{?w rdfs:label ?le FILTER(lang(?le)="en")} OPTIONAL{?w rdfs:label ?les FILTER(lang(?les)="es")} OPTIONAL{?w wdt:P18 ?img} FILTER(?sl >= 4) } ORDER BY DESC(?sl)'
q simone 'SELECT ?w ?le ?les ?sl ?img WHERE { ?w wdt:P170 wd:Q221043 . ?w wikibase:sitelinks ?sl . OPTIONAL{?w rdfs:label ?le FILTER(lang(?le)="en")} OPTIONAL{?w rdfs:label ?les FILTER(lang(?les)="es")} OPTIONAL{?w wdt:P18 ?img} FILTER(?sl >= 4) } ORDER BY DESC(?sl)'
date -u >> "$out"
