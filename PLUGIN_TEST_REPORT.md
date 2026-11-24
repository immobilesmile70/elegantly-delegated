# Elegantly Delegated Codex audit

## Live Windows runtime follow-up

**Production readiness assessment: 91/100 for supervised use.** Installation and Windows compatibility 20/20, routing and fallback 17/20, functional and Python verification 20/20, safety and reliability 19/20, credit and benchmark evidence 15/20. The native model mismatch and subscription attribution gap keep the assessment below 95/100.

On 24 November 2026, the Windows account's existing ChatGPT CLI sign-in worked with Codex 0.172.0. Verification used that sign-in without changing credentials or switching to API-key authentication. The restricted shell ran as a separate Windows identity and could see neither the sign-in nor the per-user Python install.

| Check | Observed result |
| --- | --- |
| Fresh verification | Project skill discovery and generation of both native profile files passed. |
| Native profiles | Both exact roles were registered in live regular sessions with the project trusted for the invocation. Across both native paths, worker turn metadata recorded `gpt-6.2-sol` for both profiles configured for `gpt-6-luna`. The native profile model override did not take effect in the tested CLI setup. |
| Automatic CLI routing | The routine prompt requested `gpt-6-luna` and returned `42`. The architecture prompt requested `gpt-6.2-astra` and correctly described duplicate side effects after a retry. Both completed in one attempt. The ephemeral CLI events did not expose actual model IDs. |
| Live fallback | The routing engine sent a deliberately invalid ID to the live CLI as a negative control. The CLI returned a model-unavailable error. The same prompt then succeeded on a catalog-selected `gpt-6-luna` request. The production command still filters operator preferences against the catalog. Rejection of a visible but account-ineligible model remains untested. |
| Local Python | The router found Python 3.12.10 and initially reported missing `yaml`. After installing PyYAML 6.0.3 in a temporary virtual environment, the interpreter/import probe passed and the router executed `tests/check_configs.py` successfully. The base Python environment was unchanged. |
| Native worker Python | The worker could not execute the per-user interpreter from the sandbox. With a copy of the installation under the temporary trusted project and the existing Windows sandbox mode, `ed-implement` reported stdout `42` and exit code 0. `ed-recon` independently returned `42` for its arithmetic prompt. |
| Credits | Both conditions answered both matched CLI tasks correctly. Total input decreased while input excluding cache hits increased. Subscription debit and credit savings remain unverified. See [benchmark report](BENCHMARK_REPORT.md). |
| Regression suite | 33 Node tests passed and `git diff --check` passed. |

## Repair and verification update

**24 November 2026 · Production readiness 80/100 for supervised use.** The 95/100 target remains open pending live CLI and Python verification. The original audit follows this update for comparison.

| Area | Score | Basis |
| --- | ---: | --- |
| Installation and Windows compatibility | 19/20 | Both installers passed with spaced paths. Fresh CLI confirmed project skill discovery. Live profile invocation is open. |
| Model routing and fallback | 17/20 | Live differentiated Work models and subprocess fallback regression coverage. Live provider rejection and standalone CLI fallback are open. |
| Functional verification and Python | 16/20 | 33 repository tests passed. Python discovery passes mocked Windows cases. The actual host lacks a discoverable interpreter. |
| Safety and reliability | 18/20 | Bounded attempts, time and parallelism, auth and quota stops, read-only launches, structured logging, and managed-file backups. Hosted enforcement still needs live exercise. |
| Credit and benchmark evidence | 10/20 | One paired Work model probe with attributed counters and quality checks. Standalone CLI benchmark and plan quota measurement remain open. |
| **Total** | **80/100** | |

### Implemented

- The signed-in Codex CLI router consults the discovered catalog, chooses a routine or complex tier based on the task, and chooses a supported reasoning level where reported. Operator preferences are filtered against visible entries. No model IDs are hard-coded in the router. An independent prompt uses one turn when the first attempt succeeds. Parallel batches use independent read-only prompts. Native writing workers remain available through the installed skill and optional profiles.
- Fallback preserves the exact original prompt, switches to a distinct tier-compatible candidate, and caps attempts, request time, batch time, and concurrency. Authentication, permission, and quota errors block additional work across the batch. Recognized transient throttling receives a short backoff. Existing in-flight turns may finish. An observed-token threshold blocks further attempts once observed usage reaches it.
- The router uses the local Codex CLI's ChatGPT sign-in and built-in OpenAI provider selection. It strips OpenAI/Codex API-key environment variables and the API base URL override from the child environment. It uses read-only sandboxing, disables collaborative spawning for its own turns, and requests disabled integration features. Per-role JSON diagnostics report attempt counts, elapsed time, known usage, and coverage. Requested model IDs and observed model evidence are recorded separately. A missing usage field stays unknown.
- The Python helper discovers Windows launcher, PATH, virtual environments, Python registry records, common installs, and an explicit absolute override. It validates the interpreter and imports, then optionally runs the requested local Python script directly. It installs no dependencies.
- Installer-managed replacements now create a verified byte-for-byte backup. PowerShell and Git Bash launchers can invoke the router. The repository's project skill was refreshed and matches the canonical SHA-256 `10d26deb74018d91f525c7e936932f0f97efa4e838e933f14406809ce94e005f`. Its prior bytes are under `.elegantly-delegated/backups/`. The global skill and configuration were left untouched.

### Verified on this Windows host

| Check | Result |
| --- | --- |
| Node suite, including installer backups, cached usage and quota stops | **33 passed, 0 failed**. Runs included a real subprocess integration with a controlled Codex double, simulated provider failures, concurrent execution and a process timeout. |
| PowerShell and Git Bash install and router launchers | **PASS**. Both installed a skill and two worker TOMLs in paths containing spaces. Both launched catalog inspection. |
| Fresh CLI skill discovery | **PASS**. CLI 0.172.0 with a disposable CODEX_HOME discovered the exact project skill path. Both profile files were checked. Profile selection and execution inside a signed-in fresh CLI are **UNVERIFIED**. |
| Delegated Windows Python | **BLOCKED**. The Work worker and supervisor received `python_unavailable`. No interpreter appeared in the worker PATH check. Python/PyYAML workload execution remains **UNVERIFIED**. |
| CLI fallback and paid usage | Fallback classifications and bounded behavior passed with controlled faults. Live standalone provider rejection and quota attribution are **UNVERIFIED**. |
| Matched CLI benchmark | **BLOCKED** before inference. The standalone CLI has no ChatGPT sign-in in the offline shell. |
| Live Work routing pair | Model metadata confirmed `gpt-6.2-sol` and `gpt-6-luna`. Correctness was 6/6 and 5/6 respectively. The routine output failed signed-zero preservation. See [BENCHMARK_REPORT.md](BENCHMARK_REPORT.md) for tokens, times, and comparability limits. |
| Repository diff and credential scan | `git diff --check` passed. A bounded, filename-only pattern search found no common token or private-key strings in the checkout. |

The CLI runner does not activate automatically on arbitrary terminal commands, classify native Work tasks outside the skill, or perform autonomous workspace writes. A missing CLI sign-in, an unavailable Python interpreter, and inaccessible quota information are external verification blockers. The [README](README.md#codex-routing-and-verification) contains the exact install and verification commands.

## Original audit

**Audit date** 24 November 2026  
**Source revision** `4e5a6e6` plus the benchmark fix and regression test below  
**Environment** Windows, Codex CLI 0.172.0, Node.js 26.13.1, Git Bash 5.3.15, and the existing Codex Work session  
**Production readiness** 69/100 for supervised Codex use. Credit optimization and unattended routing remain unverified.

## Installation and configuration

The audited checkout is `C:/Users/mihir/elegantly-delegated`. Its distribution consists of the canonical Markdown skill, PowerShell and Bash launchers, a common Node installer and harness renderers, documentation, configuration and lifecycle tests, and eight benchmark fixtures. No Codex marketplace manifest or independently running router is present. The installer offers 13 harness targets, six with optional worker profiles. Runtime checks in this audit cover Codex.

- Both the global `~/.agents/skills/elegantly-delegated/SKILL.md` and repository `.agents/skills/elegantly-delegated/SKILL.md` match the canonical file byte for byte. Each receipt lists only the skill. The global copy appeared in this session's skill catalog and was invoked for the audit. Project-only discovery in a fresh session is **UNVERIFIED** because the global copy was also visible.
- The checkout is trusted in the inspected Codex configuration. Neither scope had an installed `ed-recon` or `ed-implement` profile. No explicit supervisor/provider, worker model, concurrency, or depth override was present in the inspected global config. The active host exposed four concurrency slots and required an explicit user request or an applicable instruction for spawning.
- The Windows CLI reported legacy `multi_agent=true` (deprecated) and `multi_agent_v2=false`. Four successful live collaboration turns establish native worker availability on the current Work surface. Those results do not establish standalone CLI worker availability.
- Both Windows launchers installed the skill plus both worker TOMLs into isolated directories containing spaces, using the real catalog ID `gpt-5.6-luna`. PowerShell required a process-scoped `-ExecutionPolicy Bypass`. The `codex.ps1` shim was also blocked by script policy, while `codex.cmd` worked. Git Bash passed with arguments quoted inside a Bash script. An initial PowerShell-to-Bash inline command lost the intended argument boundaries and created a skill-only fixture. The verified Bash rerun checked all three output files.
- Git rejected the sandbox account's ownership mismatch. A command-scoped `-c safe.directory=C:/Users/mihir/elegantly-delegated` allowed review without changing global settings. Python and its launcher were unavailable on PATH and in accessible searched locations. WSL returned access denied. The Python workload tests and the Python/PyYAML schema suite are **UNVERIFIED**. Installer assertions and PowerShell/Bash file checks passed.
- The installed copies, receipts, and global Codex settings were left untouched. The pre-existing untracked project `.agents/` directory was preserved.

## Routing architecture and model evidence

The skill guides the supervisor to keep trivial and tightly coupled work local, delegate bounded contracts when worthwhile, and verify all contributions. Architecture, integration, and fallback decisions remain with the supervisor. Codex owns worker creation, model assignment, permissions, and execution. The installer renders two standalone profiles with a user-supplied model ID, one shared model for both roles per installer invocation. It checks syntax and rejects aliases such as `inherit`, but performs no account entitlement check. Generated profiles inherit the parent provider according to the checkout's Codex configuration guide.

| Evidence | Result |
| --- | --- |
| Work host's exposed override IDs and visible cached catalog | `gpt-6.2-sol`, `gpt-6.2-astra`, `gpt-6.1-terra`, `gpt-6.1-sol`, `gpt-6-astra`, `gpt-6-sol`, `gpt-6-luna`, `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna` |
| Hidden cached entries | `gpt-reserve` and `codex-auto-review`. Eligibility and intended public use **UNVERIFIED**. |
| Observed supervisor | Local Codex `turn_context.model` identified `gpt-6.2-sol`. The session recorded provider `openai`. |
| Observed workers | One Astra turn and three Luna turns matched their explicit requests in local `turn_context.model` metadata. Backend attribution beyond the harness is **UNVERIFIED**. |
| Installed profile execution | TOML generation passed. Fresh signed-in CLI profile discovery and execution are **UNVERIFIED**. Live Work calls used explicit native overrides, without the generated profiles. |
| Automatic activation and routing | Explicit invocation and bounded native delegation worked. Automatic invocation on a prompt without a delegation request is **UNVERIFIED**. The skill has no independent routing service, cross-provider control, or built-in model retry engine. |
| Fallback | Skill instructs the supervisor to continue directly or choose a known suitable model after a bounded correction. Runtime behavior for a catalog-valid but unavailable model is **UNVERIFIED**. |

## Isolated workloads

Artifacts are in `%TEMP%/ed-audit-6723af750bdd4bfdae20480d72c7f080`. The REST and mixed rows share one API implementation and one acceptance run. This avoids counting the same verification as two independent experiments. Worker timing is measured from the local Codex task start to task completion. Input/output counts are the final worker-turn counters. Direct workload generation ran inside the audit turn, so per-task generation timing and tokens were unavailable.

| # | Complexity and workload | Expected / observed model | Delegation | Time and tokens | Errors, quality, and result |
| --- | --- | --- | --- | --- | --- |
| 1 | Simple Python calculator | Direct supervisor / `gpt-6.2-sol` at audit-turn level | Direct, as the skill recommends for a trivial task | Per-task time and tokens unavailable | Four operations, CLI validation, zero-division handling, and unittest assertions written. Python unavailable. **UNVERIFIED** runtime. |
| 2 | Moderate REST API with validation | Direct supervisor / `gpt-6.2-sol` at audit-turn level | Supervisor implementation, with separate contract checks for mixed workload | 6.2 ms for 18 handler cases and 61.7 ms for the same 18 over loopback HTTP. Generation counters unavailable. | Passed checks for valid means including large finite values, input size, invalid data, routing, media type, and HTTP methods. **PASS**. |
| 3 | Complex scalable task-service architecture | `gpt-6.2-astra` / `gpt-6.2-astra` | Explicit native worker used for the routing probe. Supervisor reviewed and retained architecture ownership. | 17.472 s. 20,688 input, 387 output. | Design addressed transactional outbox, duplicates, tenant isolation, leases, failure recovery, and measurable burst checks. **PASS** design review. Proposed load targets were untested. |
| 4 | Moderate debugging task for Python mean | `gpt-5.6-luna` / `gpt-5.6-luna` | Explicit bounded native worker | 11.062 s. 17,619 input, 356 output. | Patch replaced floor division, accepts single-pass iterables by materializing once, and handles empty input. Logic reviewed and runnable assertions retained. **PASS** routing and review, **UNVERIFIED** Python execution. |
| 5 | Mixed plan, build, test, and document the mean service | `gpt-5.6-luna` for both workers / `gpt-5.6-luna` for both, plus supervisor | Two native workers supplied independent acceptance cases and docs. Supervisor implemented, ran tests, and integrated. | Acceptance worker 10.866 s and 17,643 input / 309 output. Docs worker 9.335 s and 17,644 input / 271 output. Full integration time unavailable. | All API checks passed and the documented example matched a tested case. **PASS**. |
| 6 | Failure handling for model selection | No inference expected for rejected installer argument | Local failure only | Standalone duration unavailable. No inference in installer rejection. | Reserved `inherit` rejected with exit 1 and no destination. **PASS** validation. Provider-level unavailability and fallback **UNVERIFIED**. |
| 7 | Parallel execution | Astra and Luna across the first pair, Luna twice in the second / matching turn metadata | Two independent pairs completed | Architecture/debug interval overlap 11.062 s. Contract/docs overlap 5.974 s. Tokens are included in rows 3–5. | No worker errors reported. **PASS** concurrent native turns. Speedup versus serial execution **UNVERIFIED**. |

## Defects, repairs, and verification

| Severity | Finding and root cause | Disposition |
| --- | --- | --- |
| High for benchmarking | Fixture preparation failed on Node 26.13.1 with `ERR_FS_CP_EEXIST`. The script created the target directory and then tried to copy the source directory onto it with `force: false` and `errorOnExist: true`. | `benchmarks/prepare.mjs` now reserves the root with exclusive directory creation, then copies fixture entries without overwriting. Existing targets still produce the established exit code and message. Added an automated regression for multi-file copying into a new nested location and preservation of a local file on a repeat attempt. |
| Medium, environment | PowerShell's script policy blocks normal unsigned `.ps1` execution. Git ownership checks reject the sandbox identity. | Verified process-scoped PowerShell invocation, `codex.cmd`, and per-command Git ownership handling. No global configuration changes. |
| Medium, operational limitation | The current skill-only install has no custom roles. Native worker profiles are optional. Codex reconnaissance is instruction-only read-only in a writable parent. | Verified the generated roles in isolation and used text-only workers for live probes. Filesystem enforcement for worker-specific boundaries remains a host-level requirement. |
| Medium, verification gap | No usable local Python and no separate authenticated CLI baseline in the offline shell. | Preserved runnable Python checks and recorded the verification gap. |
| Low, recovery limitation | An interrupted preparation can leave a partially copied directory. A forcibly terminated installer can leave an exclusive lock. | Use a fresh benchmark destination if copying is interrupted. The installer detects a stale lock and prints its path and recovery advice. A live crash-recovery drill was outside the measured audit. |

Before repair the Node suite reported **22 passed, 1 failed**. After repair and regression coverage it reported **24 passed, 0 failed** in 1.223 s. Reviewed the source and test changes with Git diff. `git diff --check` passed. Existing tests cover installer receipt recovery, idempotence, conflicting files, local edits, linked destinations, lock contention, and missing-path uninstall. They also confirm each unmodified benchmark fixture is rejected by its evaluator, establishing verifier sensitivity to missing behavior.

## Credit and authentication

The code inspected contains no independent inference client or billing integration. Worker inference in the audit ran through native tools in the active Codex Work session. The package itself requires no separate API key or paid service for native delegation. The shell's standalone `codex.cmd login status` returned `Not logged in`, including under an isolated `CODEX_HOME`, and the command sandbox reported disabled network access. This is distinct from authentication in the active Work session. The account's actual subscription tier, quota debit, and attribution are **UNVERIFIED**. No separately billed API calls were used. [OpenAI Codex app-server plan authentication](https://developers.openai.com/siwc/token-sharing-open-source/codex-app-server?translationFallback=es-419)

The four measured worker turns consumed **73,594 input tokens**, including **53,120 cached input tokens**, and **1,323 output tokens**, or **74,917 total tokens** as defined by the harness. These exclude supervisor usage. Each small Luna turn still had roughly 17.6K input tokens with an empty conversation fork and a short contract. This establishes substantial worker input volume under this host, with much of it cached. It does not identify every component of the input or establish its quota cost. The documentation-only worker delivered a usable result, but its overhead is a reason to keep similarly small work local absent measured benefit. Each worker had one completed turn, with no observed retries or escalations.

A matched standard-Codex comparison requires a fresh authenticated baseline where skill discovery can be controlled. The baseline preflight was blocked by the offline shell and absent CLI login. Direct calculator and supervisor API implementation are useful behavior checks, but they are different workloads and cannot supply an equivalent token or quality baseline. No savings percentage, cost estimate, speedup claim, or quality-retention rate is supported. Git timings, verifier timings, and cache counters are distinct from billable usage.

## Security and reliability

- A filename-only credential-pattern scan of current tracked repository files found no common API tokens or private-key headers. Credential stores and unrelated histories were excluded. The installer uses local file operations and accepts model identifiers, not credentials. The audit did not print credential values.
- Installer writes use temporary files, exclusive creation, a receipt with pending hashes, and an installation lock. Existing tests verify protection for edited content and linked destinations. This audit did not test adversarial filesystem races.
- The skill and generated profiles direct workers to avoid recursive spawning. Four workers were parent-launched across two pairs. None spawned descendants. A host-level nesting limit and timeouts are necessary for enforced protection. Enforcement of a recursion limit, timeout, or retry ceiling on this surface is **UNVERIFIED**. The installer does not set them.
- The workers had bounded text-only assignments. The supervisor wrote workload artifacts only under the isolated temporary workspace. No worker writes occurred. Per-file write ownership is a collaboration convention for Codex profiles. To enforce it, use a read-only worker session for reconnaissance or narrow the writable root for implementation. A write-denial probe for unrelated paths was not run.

## Readiness and recommended improvements

| Area | Score |
| --- | ---: |
| Installation and Windows compatibility | 18/20 |
| Native routing and model observability | 17/20 |
| Functional evidence and regression coverage | 16/20 |
| Security and failure recovery | 13/20 |
| Credit optimization evidence | 5/20 |
| **Total** | **69/100** |

1. Run a signed-in, isolated Codex pilot with identical fixtures and matched direct, native-only, and skill-guided conditions. Record complete supervisor and worker usage, cached input, elapsed time, independently verified success, and attributable quota.
2. Verify native profile discovery in a new trusted session. Use an account-confirmed unavailable catalog model on a controlled fixture to exercise failure and bounded recovery without introducing a fabricated model ID.
3. Set and verify suitable host concurrency, nesting, and timeout limits before unattended use. Test filesystem write enforcement with a narrowly scoped sandbox.
4. Extend Windows CI to cover Git Bash, Node 22 and a current supported Node release. Run the Python and PyYAML schema suite in a Python-enabled environment and retain the verification output.
