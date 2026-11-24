$node = Get-Command node -CommandType Application -TotalCount 1 -ErrorAction SilentlyContinue
if (-not $node) {
    [Console]::Error.WriteLine('elegantly-delegated requires Node.js 22 or newer.')
    exit 1
}

& $node.Source (Join-Path $PSScriptRoot 'scripts/install.mjs') @args
exit $LASTEXITCODE
