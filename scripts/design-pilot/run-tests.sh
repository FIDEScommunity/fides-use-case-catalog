#!/usr/bin/env bash
# Run the design-pilot behaviour tests inside the local pilot WordPress.
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

pilot_wp eval-file "$HERE/tests/use-case-design-behaviour.php"
pilot_wp eval-file "$HERE/tests/site-shell-behaviour.php"
pilot_wp eval-file "$HERE/tests/organization-design-behaviour.php"
pilot_wp eval-file "$HERE/tests/wallet-design-behaviour.php"
pilot_wp eval-file "$HERE/tests/credential-design-behaviour.php"
pilot_wp eval-file "$HERE/tests/learn-behaviour.php"
pilot_wp eval-file "$HERE/tests/updates-behaviour.php"
pilot_wp eval-file "$HERE/tests/home-behaviour.php"
pilot_wp eval-file "$HERE/tests/manifesto-behaviour.php"
