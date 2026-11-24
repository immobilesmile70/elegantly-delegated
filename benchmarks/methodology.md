# Evaluation methodology

## Questions and conditions

The primary question is whether a portable delegation skill changes verified quality or total inference cost relative to the same harness's ordinary native delegation. The secondary question is whether skill-guided delegation retains enough quality to be economical compared with a frontier model executing alone.

| Condition | Supervisor | Available workers | Skill |
| --- | --- | --- | --- |
| A | Frontier model | Disabled | Disabled |
| B | Lightweight model | Disabled | Disabled |
| C | Frontier model | Configured lightweight models | Disabled |
| D | Same frontier model as C | Same configured models as C | Installed |

Run C and D first. Keep the task prompt, tools, permission decisions, effort, provider, harness version, environment, and starting fixture identical. Record any runtime fallback and skill activation separately. A and B are optional baselines. [Manual protocol and tasks](../test.md)

## Run design

- Block by harness, task, and configured model combination. Alternate or randomize C/D order within each block. Keep task prompts and external verifiers at the recorded repository revision.
- Precommit the time ceiling, attempt limit and abort criteria before the pilot. Record every submitted run as success, failure, or invalid with a reason. A timeout, incomplete solution, or failed worker is an outcome. Examples of invalid runs include fixture mismatch and a service interruption that prevents the task from starting.
- Run the evaluator tests outside the agent's workspace after it finishes. Check scope and specified behavioral invariants in the patch. Count a success only when completion, acceptance, regressions, and essential scope checks all pass. Assess candidate-written tests for relevance. A second team member can review ambiguous outcomes without the condition label.
- Preserve effective runtime model evidence. A configuration file establishes the requested model. Verify the actual model with an attributed runtime field or provider record. Keep runs with unverified heterogeneous capability out of the confirmed routing analysis and retain the uncertainty in the general run record.
- Record preflight discoveries separately. Include all valid D runs in the installed-condition analysis, even when automatic activation is absent or unobservable. Treat confirmed activation and confirmed heterogeneous routing summaries as secondary, since they select on post-assignment behavior.
- For regression assessment, distinguish a failure of newly requested behavior from a failure of an invariant expected to hold in the starting fixture. Keep unavailable measurements as `N/A`.

## Analysis

Report raw counts, denominators, and per-task paired outcomes before aggregates. Keep harnesses separate if their model catalogs or telemetry prevent equal comparisons. Use identical comparable run subsets for each cost or token comparison and report missing coverage.

| Metric | Calculation |
| --- | --- |
| Verified success rate | Verified successful runs / valid runs |
| Cost per verified success | Total comparable cost of all valid attempts, including failures, / verified successful runs |
| Frontier-token reduction | (Baseline frontier tokens − D frontier tokens) / baseline frontier tokens, summed over matched runs. Report input and output separately when available |
| Total inference-cost reduction | (Baseline total inference cost − D total inference cost) / baseline cost, summed over matched runs |
| Performance retention | D success rate / A success rate on matched task and harness sets. Also give the absolute percentage-point difference |
| Regression rate | Runs with at least one pre-existing behavior regression / valid runs with regression evidence |
| Improvement over ordinary delegation | D success rate minus C success rate in percentage points. Report D versus C cost per verified success, retries, and latency alongside it |

Use `N/A` for zero denominators and missing telemetry. Latency starts at submission and ends at the final response, recorded failure, or timeout. Report the median and individual times for a small pilot. Track worker starts, escalations to stronger models or supervisor intervention, repeated attempts, workflow constraints violated, and representative failure cases.

For API-equivalent cost, multiply billable usage in each model and token category by the applicable dated rate. Verify whether cached inputs and reasoning outputs are subsets of other counters before splitting charges. Include every supervisor, worker, retry, and escalation call covered by the evidence. Keep actual API costs, subscription quota units, and estimated API-equivalent prices in separate columns. An incomplete estimate cannot establish total cost reduction.

## Evidence and interpretation

Preserve a sanitized patch, verifier output, configuration, attribution evidence, and transcript references for every measured run. Save run records using [the results template](results/README.md). Prefer an auditable result with a narrow claim when the harness exposes limited evidence.

The pilot is descriptive. If time and budget permit, repeat matched conditions across more tasks, model combinations, and harness versions, and report uncertainty around paired effects. The public fixtures can become part of model training data. Run new held-out fixtures in a follow-up study before making broader performance claims.
