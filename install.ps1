$node = Get-Command node -CommandType Application -TotalCount 1 -ErrorAction SilentlyContinue
if (-not $node) {
    [Console]::Error.WriteLine('elegantly-delegated requires Node.js 22 or newer.')
    exit 1
}

$entry = 'scripts/install.mjs'
if ($args.Count -gt 0 -and $args[0] -eq '--codex-route') {
    $entry = 'scripts/codex-route.mjs'
    $args = @($args | Select-Object -Skip 1)
}

& $node.Source (Join-Path $PSScriptRoot $entry) @args
exit $LASTEXITCODE
