"""Parse the art-quiz dataset's images.js as plain text (never executed).

Usage: python3 -I parse_rs_dataset.py <path/to/images.js> [out.json]
Prints a per-author summary; optionally writes the parsed records as JSON.
"""
import json
import re
import sys
from collections import defaultdict

ENTRY = re.compile(
    r"\{\s*author:\s*'(?P<author>(?:[^'\\]|\\.)*)',\s*"
    r"name:\s*'(?P<name>(?:[^'\\]|\\.)*)',\s*"
    r"year:\s*'(?P<year>(?:[^'\\]|\\.)*)',\s*"
    r"imageNum:\s*'(?P<num>\d+)',?\s*\}",
    re.S,
)


def main() -> None:
    src = open(sys.argv[1], encoding="utf-8").read()
    records = [
        {
            "author": m["author"].replace("\\'", "'"),
            "name": m["name"].replace("\\'", "'"),
            "year": m["year"],
            "num": int(m["num"]),
        }
        for m in ENTRY.finditer(src)
    ]
    by_author = defaultdict(list)
    for r in records:
        by_author[r["author"]].append(r)
    print(len(records), "records,", len(by_author), "authors")
    for author, works in sorted(by_author.items(), key=lambda kv: -len(kv[1])):
        listing = "; ".join(f"{w['num']}:{w['name']} ({w['year']})" for w in works)
        print(f"{len(works)} | {author} | {listing}")
    if len(sys.argv) > 2:
        with open(sys.argv[2], "w", encoding="utf-8") as fh:
            json.dump(records, fh, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
