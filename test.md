# Manual evaluation

Start with **ED-01** (small and tightly scoped) and **ED-06** (independent modules). Two tasks × four harnesses × two conditions gives **up to 16 pilot runs**. If a harness cannot establish heterogeneous execution, record the capability check separately and omit that harness from the heterogeneous comparison. Expand after verifying setup and telemetry. A student-budget pilot provides preliminary evidence.

## Run a matched pair

1. Run the setup command for the task twice with distinct fresh paths. Use Node.js 22 or newer. Create each workspace outside this project so the agent cannot browse the evaluator, other runs, or their evidence. Record `git rev-parse HEAD` from this project as the fixture and policy source revision.
2. For harnesses that use Git roots or worktrees, initialize each fixture as a Git repository before installing the profiles. Run the following for each workspace. Compare the outputs of `git -C "../ed-01-run" rev-parse 'HEAD^{tree}'` to verify identical starting fixture trees.

   ```sh
   git -C "../ed-01-run" init
   git -C "../ed-01-run" add .
   git -C "../ed-01-run" commit -m "Start ED-01 fixture"
   ```

3. Use the [harness steps](#harness-procedures) to install the same workers into both workspaces. Keep supervisor, worker models, reasoning effort, permissions, version, environment, integrations, and approval behavior identical. Use a clean account or isolate existing configuration so no other delegation policy or copy of this skill leaks into either condition.
4. **Condition C — native delegation without the skill.** Remove the project's skill with `--uninstall --only-skill`. Keep the worker profiles installed. Check every effective discovery path, including compatible paths, plugins, and user or managed scopes, for another copy. Confirm it is absent from the session's skills list where the harness exposes one.
5. **Condition D — native delegation with the skill.** Keep the skill installed. Confirm it appears in the harness or, in an unmeasured preflight conversation, explicitly invoke it and inspect the tool or file load. Open a new session for the measured task. Submit the exact same task prompt as C with no slash prefix or extra instruction. Capture actual skill invocation from the tool card, file read, or trace where exposed. If missing or unobservable, record that status and keep the run in the installed-condition results. Report confirmed-activation results separately if computing them.
6. After setup, store both installer receipts outside the run workspaces so the installer metadata stays out of the test. Keep each receipt with its workspace ID in case you need to restore it. Randomize or alternate which condition runs first. Start a new session from the corresponding clean workspace, paste the prompt, and start timing at submission. Stop at final response or the agreed timeout. Before running the external verifier, save the transcript, worker traces, patch, token evidence, and endpoint or provider billing evidence where available. Keep approval decisions consistent across conditions and record any intervention.
7. Run the task's verification command yourself from this repository. Keep the entire output and inspect the patch for the listed invariants. Start subsequent runs with new fixture directories and new sessions. Repeat matched pairs where the budget permits.

Conditions **A** and **B** are optional. A runs the frontier model independently, and B runs the lightweight model independently. Disable the skill and native delegation for both through the harness's own permissions or controls. If enforcement is unavailable, record the limitation and verify the trace before counting a run as single-model. Compare A with D for the overall economics of delegation, and C with D for the policy's contribution. [Full methodology and calculations](benchmarks/methodology.md)

## Harness procedures

Installer commands below run from this repository. Substitute the workspace path and account-specific model IDs. Use `bash install.sh` or `.\install.ps1` with the same arguments. For C append `--uninstall --only-skill` to the matching target and project arguments, omitting `--worker-model`. For D leave the copy installed or reinstall the skill using the same target and project arguments. Reset each time by preparing another clean fixture as above.

### Claude Code

- Install using `node scripts/install.mjs --target claude-code --project "../ed-01-run" --worker-model haiku`. Select your lower-cost model with a supported alias or exact ID. Confirm both workers in `/agents` and any global model-force settings before starting.
- From the fixture run a fresh `claude --model MODEL_ID`. In a separate preflight session use `/elegantly-delegated` to confirm discovery. In measured D inspect the session for the skill load. Check `.claude/skills`, `CLAUDE_CONFIG_DIR` or `~/.claude/skills`, and managed and plugin sources in C.
- Monitor `/tasks` while a worker runs. On supported versions the task row reports the active model. Save the task ID, worker model label, and any fallback notice. Collect session and child JSONL from the client data directory when available. Use `/usage` and available provider billing or message telemetry. Establish whether each reported quantity is session-wide before assigning usage to a worker.
- Use the client transcript export if available, or save the local session JSONL and child JSONL. Capture the effective backend and model versions if aliases resolve differently. [Skills](https://code.claude.com/docs/en/skills) · [Subagent models and traces](https://code.claude.com/docs/en/sub-agents) · [Model configuration](https://code.claude.com/docs/en/model-config) · [Usage](https://code.claude.com/docs/en/costs)

### Google Antigravity

- Install using `node scripts/install.mjs --target antigravity --project "../ed-01-run" --worker-model flash`. Use the current Antigravity App or CLI, with its version and plan recorded. Start a new App conversation in the fixture or launch `agy` from it. Select the same supervisor with the App model picker or CLI `/model`.
- Inspect the skills list and try `/elegantly-delegated` in an unmeasured D preflight. After disabling or changing files, start a new conversation or use the documented skills reload. For C inspect `.agents/skills`, `~/.gemini/config/skills`, CLI-only folders, plugin paths, and parent workspace paths.
- Use `/agents` and the subagent detail view (or the App subagent panel) to record worker IDs, status, configured tier, and any runtime model evidence. Save a local transcript by copying the parent and child logs exposed by the client. Use `/usage` for documented model quota usage and record any provider-based measurements separately.
- The custom-agent schema explicitly supports tier routing. Live effective identities for this project are pending. Run an unmeasured or separately labeled capability demonstration first. Give the supervisor a small read-only task for `ed-recon` and capture the delegation event and any model attribution. If your build lacks custom workers, demonstrate skill discovery and direct execution. If you can observe a worker but cannot establish a different effective model, keep the demonstration out of the heterogeneous benchmark. Mark unavailable token and identity fields `N/A`. [Skills](https://antigravity.google/docs/skills) · [Subagents](https://antigravity.google/docs/subagents) · [Discovery](https://antigravity.google/docs/customization-discovery) · [Quota display](https://antigravity.google/docs/cli/commands/usage)

### OpenAI Codex

- Install using `node scripts/install.mjs --target codex --project "../ed-01-run" --worker-model MODEL_ID`. Choose a lower-cost model available within the supervisor's provider. Trust fixture project configuration and keep the same sandbox, approvals, provider, and effort. Adjust `model_reasoning_effort` in both worker profiles if needed.
- Start a fresh `codex --model SUPERVISOR_MODEL_ID` in each fixture. In a D preflight confirm `$elegantly-delegated` in the skill picker, then check for a skill read in the measured trace. In C check project and user `.agents/skills`, managed locations, and plugins. Codex can surface two same-named discoveries.
- View spawned threads with `/subagents`. Save the actual worker model only where thread configuration/metadata or provider request records attribute it to that worker. Inspect `/status` for session configuration and usage. If using `codex exec --json` instead, use it for both conditions with identical trust and permission settings. The `turn.completed` event exposes usage for the reported turn. Attribute worker tokens only where traces identify them.
- Export with `/export` on supported builds or copy the relevant JSONL under `$CODEX_HOME/sessions` (default `~/.codex/sessions`). Retain matching child-thread traces if available. [Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents) · [CLI commands](https://learn.chatgpt.com/docs/developer-commands?surface=cli) · [JSON event output](https://learn.chatgpt.com/docs/non-interactive-mode)

### OpenCode

- Use V2 for the bundled profiles. Install using `node scripts/install.mjs --target opencode --project "../ed-01-run" --worker-model PROVIDER/MODEL`. Enable both providers if they differ and choose the same supervisor in `/models` for both conditions. Keep project policies and native subagent permissions fixed.
- Launch `opencode` from the fixture with a new session. Use a D preflight to check the skill tool and prompt activation. In C audit `.opencode/skills`, `.claude/skills`, `.agents/skills`, managed and configured roots, and their user equivalents. Keep extension-driven routing disabled in both conditions unless the study explicitly controls for it.
- Observe child sessions and the skill tool calls. Inspect exported child messages or the local session messages API for model or provider metadata and per-message usage where included. Use `opencode stats` for aggregate usage and provider records for billing. Check scope before attributing any total to a particular worker.
- Save parent and child evidence with `opencode session export SESSION_ID --sanitize`. Confirm the output has the model and usage fields needed for comparison and review it for sensitive content before sharing. [Skills](https://opencode.ai/docs/skills/) · [Agents](https://opencode.ai/docs/agents/) · [CLI export and stats](https://opencode.ai/docs/cli/commands/) · [Session messages API](https://opencode.ai/docs/api/)

## Tasks

Run setup and verification commands from the root of this repository. Replace the sample `-run` destination with your own new path for each run. Copy **only** the prompt block into the agent. The commands and acceptance notes are for evaluators.

### ED-01 · Query pagination

**Difficulty and scope** — small bug fix in one function. **Starting fixture** — [pagination.mjs](benchmarks/fixtures/ed-01/pagination.mjs).

```text
Fix pagination.mjs so pagination(params) parses page and limit independently from URLSearchParams. Accept strings of ASCII decimal digits only, including leading zeros. Valid ranges are page 1–1000 and limit 1–100. Missing, malformed, or out-of-range values should use page 1 or limit 20 respectively. Use the first value if a parameter repeats. Preserve the exported function and the { page, limit } result shape. Use built-in APIs only.
```

```sh
node benchmarks/prepare.mjs ed-01 "../ed-01-run"
node benchmarks/verify.mjs ed-01 "../ed-01-run"
```

Verify defaults, both inclusive bounds, strict parsing and independent fallback. The input object and public API should remain intact. Record the common metrics and any delegation overhead on a one-function change.

### ED-02 · Shared person card

**Difficulty and scope** — small refactor with a markup invariant. **Starting fixture** — [cards.mjs](benchmarks/fixtures/ed-02/cards.mjs).

```text
Refactor cards.mjs so renderUserCard and renderAdminCard use one shared implementation of the HTML markup. Keep the existing exports and preserve their exact output, including role, CSS classes, markup order, and escaping of name and title. Use built-in APIs only.
```

```sh
node benchmarks/prepare.mjs ed-02 "../ed-02-run"
node benchmarks/verify.mjs ed-02 "../ed-02-run"
```

Verify byte-equivalent markup for both roles and inspect the diff to confirm one shared rendering path. Keep the original escaping behavior. Record the common metrics and any output or escaping regression.

### ED-03 · Persistent reading list

**Difficulty and scope** — moderate feature in a single module. **Starting fixture** — [reading-list.mjs](benchmarks/fixtures/ed-03/reading-list.mjs).

```text
Extend ReadingList to accept an optional path to a JSON file. Keep its synchronous API and current in-memory behavior when no path is supplied. With a file path, load an ordered JSON array of string titles if the file exists, or start empty if it is missing. Persist successful additions and removals so a fresh instance sees them, keeping normalization, duplicates, return values, and defensive list copies as they work today. Reject malformed JSON or data with the wrong shape without overwriting the file. Use Node.js built-ins only.
```

```sh
node benchmarks/prepare.mjs ed-03 "../ed-03-run"
node benchmarks/verify.mjs ed-03 "../ed-03-run"
```

Verify missing-file behavior, persistent add/remove, malformed data handling, short-circuit no-ops, and continued in-memory API behavior. Record the common metrics and any filesystem or error-handling regression.

### ED-04 · Orders API

**Difficulty and scope** — moderate change to a small Node HTTP API. **Starting fixture** — [server.mjs](benchmarks/fixtures/ed-04/server.mjs).

```text
Add POST /orders to the existing Node HTTP server. Accept a JSON object whose sku is 1–24 ASCII uppercase letters, digits, or hyphens and whose quantity is an integer from 1 to 20 inclusive. For valid requests return 201 and JSON with only sku and quantity. Return 413 if the raw request body exceeds 1024 bytes, or 400 on invalid JSON or fields. Error responses must be JSON objects with a string error. Preserve GET /health, the existing 404 behavior for other method/path combinations, and createApi's exported interface. Use Node.js built-ins only.
```

```sh
node benchmarks/prepare.mjs ed-04 "../ed-04-run"
node benchmarks/verify.mjs ed-04 "../ed-04-run"
```

Verify success and error status/response contracts, the byte limit, and route regressions. The evaluator needs local loopback access and no external service. Record the common metrics and any routing or response regression.

### ED-05 · Cart and receipt

**Difficulty and scope** — moderate pricing change, integration, and a regression test. **Starting fixture** — [pricing.mjs](benchmarks/fixtures/ed-05/pricing.mjs) and [receipt.mjs](benchmarks/fixtures/ed-05/receipt.mjs).

```text
Fix cart discount rounding. Compute the subtotal in integer cents and round the discount once at cart level using Math.round(subtotalCents * discountBps / 10000). Use those same totals in receipt.mjs and expose discountCents alongside the existing subtotalCents and totalCents fields. Preserve exports, the default zero-discount behavior, and input shapes. Add receipt.test.mjs using node:test with a regression for a cart where per-line rounding would disagree with cart-level rounding. Run it.
```

```sh
node benchmarks/prepare.mjs ed-05 "../ed-05-run"
node --test "../ed-05-run/receipt.test.mjs"
node benchmarks/verify.mjs ed-05 "../ed-05-run"
```

Verify cart and receipt consistency with the default and a rounding-sensitive discount. Inspect the candidate regression test to ensure it would catch the previous behavior. Record the common metrics and whether the regression test was meaningful.

### ED-06 · Independent utilities

**Difficulty and scope** — moderate batch of three independent modules. **Starting fixture** — [slug.mjs](benchmarks/fixtures/ed-06/slug.mjs), [ranges.mjs](benchmarks/fixtures/ed-06/ranges.mjs), and [clamp.mjs](benchmarks/fixtures/ed-06/clamp.mjs).

```text
Complete the three utility modules. slug(text) lowercases ASCII letters, converts runs of all other characters except ASCII digits to one hyphen, and strips leading and trailing hyphens. mergeRanges(ranges) returns sorted merged closed [start, end] pairs, merging only overlaps, including shared endpoints. The input pairs are valid and neither the array nor its pairs should be mutated or reused in the output. clamp(value, min, max) returns the finite number constrained to the inclusive bounds and throws RangeError for inverted bounds. Inputs to clamp are finite numbers. Keep each export in its existing module and use built-in APIs only.
```

```sh
node benchmarks/prepare.mjs ed-06 "../ed-06-run"
node benchmarks/verify.mjs ed-06 "../ed-06-run"
```

Verify all three contracts and the range immutability invariant. Adjacent disjoint ranges remain separate. Record the common metrics and whether any parallel work owned distinct modules.

### ED-07 · Filtered selection

**Difficulty and scope** — moderate bug fix in a small reducer. **Starting fixture** — [state.mjs](benchmarks/fixtures/ed-07/state.mjs).

```text
Fix the state reducer so a selected item must exist and be visible under the current filter. Filtering out or removing the selected item clears selectedId to null. Selecting an item that is missing or hidden should leave the existing selection as it is. Preserve case-insensitive visibility, unknown-action behavior, exports, and state shape. Do not mutate state, the items array, or item objects.
```

```sh
node benchmarks/prepare.mjs ed-07 "../ed-07-run"
node benchmarks/verify.mjs ed-07 "../ed-07-run"
```

Verify transitions for filter, select, and remove, including preservation of a still-visible selection. Check state immutability. Record the common metrics and any state-management regression.

### ED-08 · Empty-state copy

**Difficulty and scope** — trivial, one literal. **Starting fixture** — [copy.mjs](benchmarks/fixtures/ed-08/copy.mjs).

```text
In copy.mjs change emptyMessage to exactly “No items yet.” Keep loadingMessage and the rest of the workspace as they are.
```

```sh
node benchmarks/prepare.mjs ed-08 "../ed-08-run"
node benchmarks/verify.mjs ed-08 "../ed-08-run"
```

Verify the exact sentence and unchanged loading message. Inspect the patch for any other fixture edit. Record the common metrics and whether any worker was spawned for a one-literal change.

## Measurements

Copy this table for each matched pair. Fill unavailable values with `N/A`. Record an observed zero as `0`. Use run records from the [results template](benchmarks/results/README.md) to retain provenance and pricing evidence.

| Metric | Without skill (C) | With skill (D) |
| --- | --- | --- |
| Run ID / task ID / starting commit | | |
| Harness and version / OS / Node version | | |
| Skill revision and observed activation | | |
| Supervisor model and effort | | |
| Configured worker models and effort | | |
| Actual worker models and evidence | | |
| Task completed | | |
| Acceptance criteria passed | | |
| Regression tests passed | | |
| Frontier input tokens | | |
| Frontier output tokens | | |
| Worker input tokens | | |
| Worker output tokens | | |
| Cached input / reasoning tokens | | |
| Total inference cost and measurement type | | |
| Actual API charges | | |
| Subscription quota consumption | | |
| API-equivalent estimate / pricing date and source | | |
| Wall-clock duration | | |
| Number of workers spawned | | |
| Number of escalations | | |
| Failed attempts and retries | | |
| Constraint violations | | |
| Transcript / patch / verifier evidence | | |

Use the device or provider measurement only for the calls it covers. Record currency, pricing date, provider and SKU, and the source URL when calculating API-equivalent costs. Record subscription quota consumption in the units exposed by the harness. Report measured charges and estimates separately. Do not infer token counts or effective models from agent self-reports, screenshot length, or prompt length.

For each harness, divide verified successes by valid runs to get success rate. Divide total comparable cost across all attempts by verified successes to get cost per successful task. Compute frontier-token and inference-cost reductions as `(baseline − D) / baseline` on matching runs. Performance retention is `D success rate / A success rate`. Regression rate is the fraction of runs with a pre-existing behavior regression. Report improvement over native delegation as `D success rate − C success rate` in percentage points and compare C and D cost per success. Use `N/A` when inputs are missing or a denominator is zero. [Aggregation and reporting rules](benchmarks/methodology.md#analysis)
