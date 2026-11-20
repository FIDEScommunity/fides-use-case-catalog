#!/usr/bin/env python3
"""Check routes-update.txt against a Learn manifest.

Prints the routes as a comma-separated LEARN_IDS value. Exits 1 when the file
is empty, lists a route twice, names a route the manifest does not have, or
includes the enquiry form.
"""
import json
import sys

def fail(message):
    sys.stderr.write(message + "\n")
    sys.exit(1)

def routes_of(path):
    found = []
    for line in open(path, encoding="utf-8"):
        item = line.split("#", 1)[0].strip()
        if item:
            found.append(item)
    return found

def main():
    if len(sys.argv) != 3:
        fail("Usage: validate-routes-update.py routes-update.txt manifest.json")
    listed = routes_of(sys.argv[1])
    if not listed:
        fail("Refusing: routes-update.txt is empty.")
    duplicates = sorted({item for item in listed if listed.count(item) > 1})
    if duplicates:
        fail("Refusing: routes-update.txt repeats " + ", ".join(duplicates) + ".")
    for item in listed:
        if item in {"sessions/request", "sessions/request-wpforms"} or item.startswith("sessions/request"):
            fail("Refusing: " + item + " is not part of this update.")
    manifest = json.load(open(sys.argv[2], encoding="utf-8"))
    known = {page["path"] for page in manifest.get("pages", [])}
    unknown = [item for item in listed if item not in known]
    if unknown:
        fail("Refusing: routes-update.txt names unknown routes: " + ", ".join(unknown) + ".")
    sys.stdout.write(",".join(listed))

if __name__ == "__main__":
    main()
