#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
grep -Fq 'exec bash "${script_dir}/sites-env.sh" -- "$0" "$@"' scripts/install-pnpm.sh
bash -n scripts/install-pnpm.sh scripts/sites-env.sh
set +e
output="$(bash scripts/sites-env.sh -- 2>&1)"
status=$?
set -e
test "$status" -eq 64
[[ "$output" == *"usage: scripts/sites-env.sh"* ]]
echo "PASS: wrapper safe on nonexecutable Git checkout"
