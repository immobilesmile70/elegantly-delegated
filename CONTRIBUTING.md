# Contributing

Use Node.js 22 or newer for the installer and fixtures. Use Python 3.11 or newer and PyYAML to parse the generated configuration files in the schema checks.

```sh
node --test tests/*.test.mjs
python -m pip install PyYAML==6.0.3
python tests/check_configs.py
```

Use a temporary project directory when trying the installers. CI uses isolated paths and covers Windows, macOS, and Linux. See the [workflow](.github/workflows/ci.yml).

- Edit [the canonical skill](skills/elegantly-delegated/SKILL.md) in one place. Keep the operational instructions short enough to load when needed.
- For new harness targets, include official installation paths, valid native configuration, a test for generated files, and separate evidence for installation and model routing. Link each claim in [the matrix](docs/compatibility.md).
- For a reproducible benchmark submission, follow [test.md](test.md), record your starting commit, and submit an entry using [the results template](benchmarks/results/README.md). Keep sensitive transcripts local and link only sanitized evidence.
- Describe the observable change and how you verified it in your pull request.

The maintainer has yet to choose a license. Coordinate licensing questions before submitting changes intended for redistribution.
