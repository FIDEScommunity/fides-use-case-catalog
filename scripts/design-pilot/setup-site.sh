#!/usr/bin/env bash
# Create the local-only design pilot site from a snapshot of utrecht-demo.
#   - files:    $PILOT_SITE (copy; the two pilot plugins are symlinks to the worktrees)
#   - database: $PILOT_DB (new database on the Local MySQL server of utrecht-demo)
#   - URL:      $PILOT_URL (served by start-server.sh)
# utrecht-demo itself is only read (rsync source + mysqldump), never written.
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -e "$PILOT_SITE" ]]; then
  echo "Pilot site already exists at $PILOT_SITE. Run teardown-site.sh first." >&2
  exit 1
fi
if pilot_mysql -N -e "SHOW DATABASES LIKE '$PILOT_DB'" | grep -q "$PILOT_DB"; then
  echo "Database $PILOT_DB already exists. Run teardown-site.sh first." >&2
  exit 1
fi

echo "1/6 Copy WordPress files (without the two pilot plugins)"
mkdir -p "$PILOT_SITE"
rsync -a \
  --exclude='wp-content/plugins/fides-use-case-catalog' \
  --exclude='wp-content/plugins/fides-community-tools-tiles' \
  --exclude='wp-content/debug.log' \
  --exclude='wp-content/cache' \
  "$SOURCE_SITE/" "$PILOT_SITE/"

echo "2/6 Symlink pilot plugins to the worktrees"
ln -s "$PILOT_USE_CASE_PLUGIN" "$PILOT_SITE/wp-content/plugins/fides-use-case-catalog"
ln -s "$PILOT_TILES_PLUGIN" "$PILOT_SITE/wp-content/plugins/fides-community-tools-tiles"

echo "3/6 Install the pilot guard mu-plugin"
mkdir -p "$PILOT_SITE/wp-content/mu-plugins"
cp "$HERE/fides-design-pilot-guard.php" "$PILOT_SITE/wp-content/mu-plugins/"

echo "4/6 Clone database $SOURCE_DB -> $PILOT_DB"
pilot_mysql -e "CREATE DATABASE \`$PILOT_DB\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
"$MYSQL_BIN_DIR/mysqldump" -uroot -proot -S "$MYSQL_SOCK" --single-transaction --no-tablespaces "$SOURCE_DB" 2>/dev/null \
  | pilot_mysql "$PILOT_DB"

echo "5/6 Point wp-config.php at the pilot database and URL"
CONFIG="$PILOT_SITE/wp-config.php"
"$PHP_BIN" -c "$PHP_INI" -d xdebug.mode=off -r '
  $file = $argv[1];
  $c = file_get_contents($file);
  $c = preg_replace("/define\(\s*.DB_NAME.\s*,\s*.[^\x27\"]*.\s*\);/", "define( \x27DB_NAME\x27, \x27" . $argv[2] . "\x27 );", $c);
  $c = preg_replace("/define\(\s*.DB_HOST.\s*,\s*.[^\x27\"]*.\s*\);/", "define( \x27DB_HOST\x27, \x27localhost:" . $argv[3] . "\x27 );", $c);
  $extra = "\n/* FIDES design pilot (local only) */\n"
    . "define( \x27WP_HOME\x27, \x27" . $argv[4] . "\x27 );\n"
    . "define( \x27WP_SITEURL\x27, \x27" . $argv[4] . "\x27 );\n"
    . "define( \x27DISABLE_WP_CRON\x27, true );\n"
    . "define( \x27FIDES_DESIGN_PILOT\x27, true );\n";
  $c = preg_replace("/(\/\* That.s all, stop editing!)/", $extra . "\n$1", $c, 1);
  file_put_contents($file, $c);
' "$CONFIG" "$PILOT_DB" "$MYSQL_SOCK" "$PILOT_URL"
grep -E "DB_NAME|DB_HOST|WP_HOME|FIDES_DESIGN_PILOT" "$CONFIG"

echo "6/6 Rewrite site URLs inside the pilot database"
pilot_wp search-replace "$SOURCE_URL" "$PILOT_URL" --all-tables --skip-columns=guid --quiet
pilot_wp search-replace "https://utrecht-demo.local" "$PILOT_URL" --all-tables --skip-columns=guid --quiet
pilot_wp option get home

echo "Pilot site ready. Start it with: $HERE/start-server.sh"
