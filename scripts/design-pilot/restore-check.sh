#!/usr/bin/env bash
# Prove that a snapshot can be restored: import db.sql.gz into a scratch
# database, compare the pilot pages with the live database and compare the
# non-git copies with the live files. The live pilot is never modified.
# On success the snapshot gets a RESTORE_CHECK_OK marker (teardown-site.sh
# requires it).
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"

SNAP="${1:?usage: restore-check.sh <snapshot dir>}"
[[ -f "$SNAP/db.sql.gz" ]] || { echo "No db.sql.gz in $SNAP" >&2; exit 1; }
(cd "$SNAP" && shasum -a 256 -c SHA256SUMS --quiet) || { echo "Checksum mismatch" >&2; exit 1; }

SCRATCH="${PILOT_DB}_restorecheck"
PREFIX="$(pilot_wp eval 'global $wpdb; echo $wpdb->prefix;')"
trap 'pilot_mysql -e "DROP DATABASE IF EXISTS \`$SCRATCH\`"' EXIT
pilot_mysql -e "DROP DATABASE IF EXISTS \`$SCRATCH\`; CREATE DATABASE \`$SCRATCH\` CHARACTER SET utf8mb4"
gunzip -c "$SNAP/db.sql.gz" | pilot_mysql "$SCRATCH"

QUERY="SELECT COUNT(*), IFNULL(MD5(GROUP_CONCAT(CONCAT(ID,':',post_name,':',MD5(post_content),':',MD5(post_excerpt),':',post_status) ORDER BY ID)),'-') FROM ${PREFIX}posts WHERE post_type='page' AND post_status<>'auto-draft'"
LIVE="$(pilot_mysql -N -e "$QUERY" "$PILOT_DB")"
BACK="$(pilot_mysql -N -e "$QUERY" "$SCRATCH")"
LEARN_Q="SELECT COUNT(*) FROM ${PREFIX}postmeta WHERE meta_key='_fides_learn_seed'"
LIVE_L="$(pilot_mysql -N -e "$LEARN_Q" "$PILOT_DB")"
BACK_L="$(pilot_mysql -N -e "$LEARN_Q" "$SCRATCH")"
echo "pages (count, digest) live:     $LIVE"
echo "pages (count, digest) restored: $BACK"
echo "Learn seed marker rows live/restored: $LIVE_L / $BACK_L"
if [[ "$LIVE" != "$BACK" || "$LIVE_L" != "$BACK_L" ]]; then
  echo "Restore check FAILED: database differs from the live pilot (was it edited after the snapshot?)." >&2
  exit 1
fi

for item in plugins/fides-template-pilot plugins/fides-vocabulary-glossary themes/blocksy-child; do
  name="$(basename "$item")"
  if [[ -d "$SNAP/non-git/$item" ]]; then
    diff -rq "$SNAP/non-git/$item" "$PILOT_SITE/wp-content/$item" > /dev/null || { echo "Non-git copy differs: $item" >&2; exit 1; }
    echo "non-git copy matches live: $item"
  fi
done
diff -rq "$SNAP/non-git/mu-plugins" "$PILOT_SITE/wp-content/mu-plugins" > /dev/null || { echo "mu-plugins differ" >&2; exit 1; }
date -u +%FT%TZ > "$SNAP/RESTORE_CHECK_OK"
echo "Restore check passed. Marker written: $SNAP/RESTORE_CHECK_OK"
