#!/usr/bin/env bash
# Shared paths for the local-only FIDES design pilot site.
# The pilot is a copy of the Local "utrecht-demo" site with its own database,
# served by PHP's built-in server. Nothing here is deployed anywhere.

PILOT_ROOT="${PILOT_ROOT:-/Users/victorvanderhulst/Projects/fides-design-pilot}"
PILOT_SITE="$PILOT_ROOT/wordpress"
PILOT_DB="${PILOT_DB:-fides_design_pilot}"
PILOT_PORT="${PILOT_PORT:-10088}"
PILOT_URL="http://localhost:$PILOT_PORT"

SOURCE_SITE="/Users/victorvanderhulst/Local Sites/utrecht-demo/app/public"
SOURCE_DB="local"
SOURCE_URL="http://utrecht-demo.local"

LOCAL_SVC="/Users/victorvanderhulst/Library/Application Support/Local"
LOCAL_RUN="$LOCAL_SVC/run/buO_mZaLl"
PHP_BIN="$LOCAL_SVC/lightning-services/php-8.2.27+1/bin/darwin-arm64/bin/php"
PHP_INI="$LOCAL_RUN/conf/php/php.ini"
MYSQL_BIN_DIR="$LOCAL_SVC/lightning-services/mysql-8.0.35+4/bin/darwin-arm64/bin"
MYSQL_SOCK="$LOCAL_RUN/mysql/mysqld.sock"
WP_CLI_PHAR="/Applications/Local.app/Contents/Resources/extraResources/bin/wp-cli/wp-cli.phar"

# Pilot plugins are symlinked from these worktrees (branch feature/fides-design-pilot).
PILOT_USE_CASE_PLUGIN="$PILOT_ROOT/use-case-catalog/wordpress-plugin/fides-use-case-catalog"
PILOT_TILES_PLUGIN="$PILOT_ROOT/fides-community-tools-tiles"

pilot_mysql() {
  "$MYSQL_BIN_DIR/mysql" -uroot -proot -S "$MYSQL_SOCK" "$@" 2> >(grep -v 'Using a password' >&2)
}

pilot_wp() {
  "$PHP_BIN" -c "$PHP_INI" -d xdebug.mode=off -d memory_limit=1024M "$WP_CLI_PHAR" --path="$PILOT_SITE" "$@"
}
