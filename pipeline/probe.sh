#!/usr/bin/env bash
# Consulta temporal (rama probe-giotto): QIDs de los frescos Scrovegni y datos de dos obras con marchante como museo.
set -u
out=pipeline/probe.txt
: > "$out"
UA='MiradaBot/0.1 (educational; github.com/medinamaria90/mirada)'
q() { echo "== $1" >> "$out"; curl -s -G --max-time 60 -A "$UA" -H 'Accept: text/csv' 'https://query.wikidata.org/sparql' --data-urlencode "query=$2" >> "$out"; echo >> "$out"; }
q giotto 'SELECT ?w ?le ?les ?sl ?loc ?locl ?img WHERE { ?w wdt:P170 wd:Q7814 . ?w wikibase:sitelinks ?sl . OPTIONAL{?w rdfs:label ?le FILTER(lang(?le)="en")} OPTIONAL{?w rdfs:label ?les FILTER(lang(?les)="es")} OPTIONAL{?w wdt:P276 ?loc . ?loc rdfs:label ?locl FILTER(lang(?locl)="en")} OPTIONAL{?w wdt:P18 ?img} FILTER(REGEX(LCASE(STR(?le)),"judas|lament|mourning|judg|kiss")) } ORDER BY DESC(?sl)'
q scrovegni 'SELECT ?w ?le ?sl ?img WHERE { ?w wdt:P276|wdt:P195 wd:Q201017 . ?w wikibase:sitelinks ?sl . OPTIONAL{?w rdfs:label ?le FILTER(lang(?le)="en")} OPTIONAL{?w wdt:P18 ?img} } ORDER BY DESC(?sl) LIMIT 60'
q obras 'SELECT ?w ?le ?p ?pl ?v ?vl WHERE { VALUES ?w {wd:Q4109849 wd:Q1523466} ?w ?p ?v . FILTER(?p IN (wdt:P195,wdt:P276,wdt:P127,wdt:P217,wdt:P1435)) OPTIONAL{?w rdfs:label ?le FILTER(lang(?le)="en")} OPTIONAL{?v rdfs:label ?vl FILTER(lang(?vl)="en")} }'
q chapel 'SELECT ?c ?l WHERE { VALUES ?c {wd:Q201017} ?c rdfs:label ?l FILTER(lang(?l)="en") }'
date -u >> "$out"
