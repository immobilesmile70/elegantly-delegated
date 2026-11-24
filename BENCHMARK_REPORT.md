# Codex routing benchmark

## Matched CLI benchmark

**24 November 2026.** Codex CLI 0.172.0 completed two matched pairs under the Windows account's existing ChatGPT sign-in. The restricted shell lacked access to that session.

| Condition | Exact answers | CLI attempts | Input | Cached input | Input excluding cache hits | Output | Total wall time |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| CLI default model and effort | 2/2 | 2 | 31,417 | 27,904 | 3,513 | 26 | 13.316 s |
| Routine route requesting `gpt-6-luna` | 2/2 | 2 | 27,195 | 23,296 | 3,899 | 26 | 12.201 s |

The routed condition used 13.4% fewer total input tokens and 11.0% more input tokens excluding cache hits. Both conditions reported zero reasoning tokens. CLI events exposed no actual model ID, backend request count, or attributable subscription debit. These two small tasks establish observed usage and exact answer agreement under the test conditions. Subscription credit savings remain unmeasured.

```powershell
Set-Location 'C:\Users\mihir\elegantly-delegated'
codex.cmd login status
node benchmarks/run-codex.mjs --run
node benchmarks/run-codex.mjs --run --reverse
```

Each invocation runs two tiny exact-JSON tasks with identical prompts, workspace, and ephemeral read-only execution. The standard condition uses the effective CLI default model and effort. The routed condition selects a routine candidate and supported effort from the CLI catalog. Each condition allows one CLI attempt. The reported run used `--reverse` after correcting the baseline to preserve its default effort. An earlier preflight overrode the default effort and was excluded from the table.

This is a **model-routing comparison**. It does not measure the effects of adding native workers to a larger project. Use [the broader evaluation protocol](test.md) for a matched native delegation trial.

## Live Work model-routing comparison

Two short, independent native Work turns used empty conversation forks and the same task text, with no tools or writes. The first used the active supervisor's standard model. The second used the routine model selected by the repaired catalog classifier. They were launched through the Work host because the local CLI had no sign-in. The pair exercises the routing decision, with neither the standalone CLI runner nor automatic fallback in the model execution path.

> Read-only benchmark. Do not use tools, edit files, or spawn agents. Implement a JS function clamp(value, min, max) for finite number arguments. Return min below the range, max above it, and the original value inside the inclusive range. Throw RangeError for inverted bounds. Output only the function source with no code fence.

| Condition | Observed model | Input | Cached input | Output | Reasoning | Total | Turn time | Accuracy | Completed model turns | Provider calls | Quota debit |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| Standard-model control | `gpt-6.2-sol` | 20,739 | 0 | 72 | 0 | 20,811 | 6.233 s | 6/6 | 1 | Unobservable | Unobservable |
| Routine-model treatment | `gpt-6-luna` | 18,773 | 0 | 48 | 0 | 18,821 | 5.348 s | 5/6 | 1 | Unobservable | Unobservable |

Evidence came from local Codex turn metadata, end-of-turn token counters, and start/finish timestamps. The supervisor separately ran the JS checks. Both candidates passed below-range, above-range, in-range, equal-bound, and inverted-bound cases. Only the standard model preserved the original signed zero for `clamp(-0, 0, 5)`, as checked with `Object.is`. The routine model used nested `Math.min` and `Math.max`, which returned positive zero. Internal Work prompts and model-specific defaults were outside operator control. Supervisor orchestration, quota debits, and provider request counts were unavailable per condition.

The routine turn used 1,990 fewer total tokens and missed one acceptance check. This single pair establishes neither equivalent quality nor subscription credit savings. No cost or savings estimate was made.
