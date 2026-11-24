#!/usr/bin/env bash
set -euo pipefail

if ! command -v node >/dev/null 2>&1; then
  printf '%s\n' 'elegantly-delegated requires Node.js 22 or newer.' >&2
  exit 1
fi

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
if [[ ${1-} == --codex-route ]]; then
  shift
  exec node "$script_dir/scripts/codex-route.mjs" "$@"
fi
exec node "$script_dir/scripts/install.mjs" "$@"
