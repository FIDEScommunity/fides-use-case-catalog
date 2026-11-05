#!/usr/bin/env bash
# Runs the readiness block checks twice: with the seeded homepage (two milestones, no business link)
# and with a temporary option holding three milestones and a business link. The option is removed again.
set -euo pipefail
cd "$(dirname "$0")/.."
source ./env.sh
export PLAYWRIGHT_MODULE="${PLAYWRIGHT_MODULE:-/Users/victorvanderhulst/Projects/untp-demo/node_modules/playwright}"
export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-$HOME/Library/Caches/ms-playwright}"
had=$(pilot_wp option get fides_ds_home_readiness --format=json 2>/dev/null || true)
restore() { if [ -n "$had" ]; then pilot_wp option update fides_ds_home_readiness "$had" --format=json >/dev/null; else pilot_wp option delete fides_ds_home_readiness >/dev/null 2>&1 || true; fi; }
trap restore EXIT
pilot_wp option delete fides_ds_home_readiness >/dev/null 2>&1 || true
echo "# seeded homepage"
rc=0
node tests/readiness-checks.cjs || rc=1
pilot_wp eval '$d = Fides_DS_Home::readiness_defaults(); $d["points"][] = array("when" => "Status: in preparation", "title" => "Implementing acts", "text" => "Example milestone used only to test the layout.", "source_label" => "European Commission", "source_url" => "https://commission.europa.eu/topics/digital-economy-and-society/european-digital-identity_en"); $d["business_target"] = "/fides-design-pilot/learn/topics/for-businesses/"; update_option("fides_ds_home_readiness", $d);'
echo "# full block (three milestones, business link)"
FULL=1 node tests/readiness-checks.cjs || rc=1
exit $rc
