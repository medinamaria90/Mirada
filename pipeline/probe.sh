#!/usr/bin/env bash
# Comprueba desde GitHub Actions qué colecciones abiertas responden. Deja el resultado en pipeline/probe.txt
set -u
out=pipeline/probe.txt
: > "$out"
probe() { code=$(curl -s -o /tmp/probe.body -w '%{http_code}' --max-time 30 -A 'MiradaBot/0.1 (educational; github.com/medinamaria90/mirada)' "$2"); echo "$1 $code $(head -c 300 /tmp/probe.body | tr '\n' ' ')" >> "$out"; echo >> "$out"; }
probe met-search 'https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&artistOrCulture=true&q=Goya'
probe met-object 'https://collectionapi.metmuseum.org/public/collection/v1/objects/436535'
probe aic 'https://api.artic.edu/api/v1/artworks/search?q=monet&limit=2&fields=id,title,artist_title,is_public_domain,image_id,date_display'
probe aic-iiif 'https://www.artic.edu/iiif/2/3c27b499-af56-f0d5-93b5-a7f2f1ad5813/full/200,/0/default.jpg'
probe cleveland 'https://openaccess-api.clevelandart.org/api/artworks/?artists=Monet&type=Painting&has_image=1&cc0=1&limit=2'
probe nga-csv 'https://raw.githubusercontent.com/NationalGalleryOfArt/opendata/main/data/published_images.csv'
probe nga-iiif 'https://api.nga.gov/iiif/00007f61-4922-417b-8f27-893ea328206c/full/200,/0/default.jpg'
probe rijks 'https://data.rijksmuseum.nl/search/collection?creator=Rembrandt%20van%20Rijn&type=painting'
probe wikimedia 'https://commons.wikimedia.org/w/api.php?action=query&titles=File:Las_Meninas,_by_Diego_Vel%C3%A1zquez,_from_Prado_in_Google_Earth.jpg&prop=imageinfo&iiprop=url|extmetadata&format=json'
probe wikidata 'https://www.wikidata.org/w/api.php?action=wbsearchentities&search=Las%20Meninas&language=es&format=json'
probe wikimedia-thumb 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Las_Meninas%2C_by_Diego_Vel%C3%A1zquez%2C_from_Prado_in_Google_Earth.jpg/320px-Las_Meninas%2C_by_Diego_Vel%C3%A1zquez%2C_from_Prado_in_Google_Earth.jpg'
probe smk 'https://api.smk.dk/api/v1/art/search/?keys=hammershoi&filters=[public_domain:true]&rows=1'
date -u >> "$out"
# relanzado 10:19
