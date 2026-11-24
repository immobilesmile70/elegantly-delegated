# Changelog

## Unreleased

- Added a ChatGPT-authenticated, read-only Codex CLI runner with catalog-based routine and complex tiers, configurable limits, bounded fallback, and per-role usage records.
- Added a Windows Python interpreter and dependency probe that checks the launcher, PATH, registered installations, common install paths, and an optional absolute override.
- Added project-scope fresh CLI skill discovery verification and an opt-in matched CLI benchmark.
- Added backup-before-replacement for installer-managed files and router support in both shell launchers.
- Added routing, fallback, concurrency, subprocess, Python discovery, and installer-backup regression coverage. Enabled Bash smoke tests on Windows CI.
- Fixed benchmark fixture preparation on Node 26 while preserving collision protection.

Live evidence and blockers are documented in [the audit](PLUGIN_TEST_REPORT.md) and [the benchmark report](BENCHMARK_REPORT.md).
