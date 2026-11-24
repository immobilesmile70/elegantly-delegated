---
name: elegantly-delegated
description: Route coding work between a capable supervisor and lower-cost workers. Use when asked to delegate, conserve frontier-model usage, or coordinate bounded work on a multi-step implementation, investigation, or review. Handle small or tightly coupled tasks directly.
---

# Elegantly Delegated

Aim for verified task quality at a lower total inference cost. The supervisor owns the architecture, integration, and final result. Respect the user's scope, model choices, permissions, and budget.

## Decide whether to delegate

- First identify the expected result, change boundaries, main risks, and the checks that will establish success. If the task is trivial, tightly coupled, hard to specify, or faster to complete than to hand off and verify, do it directly.
- Consider the full cost of delegation, including briefing, duplicate context, model calls, communication, verification, and rework. Start with the smallest number of workers justified by the work. One worker can be sufficient.
- Keep ambiguous requirements, architecture, cross-cutting design, irreversible actions, and decisions with material consequences with the supervisor. Good worker tasks include locating callers, tracing a narrow code path, implementing an agreed interface, and running a defined verification pass.
- Delegate read-only reconnaissance when it will reduce the context the supervisor needs to inspect. Ask for file paths, symbols, observed behavior, and gaps. Check findings against source or a reproducible command before using them to make consequential decisions.

## Select a worker

- Inspect the available native delegation tools and model controls. Use the least costly configured model that can reliably satisfy the contract. Use read-only access for reconnaissance and grant implementation workers only the capabilities the task requires. Prefer built-in controls over conversational permission requests.
- Check whether the worker will inherit the supervisor model, whether an override applies, and whether the harness reports the model actually used. If lower-cost routing is unavailable or cannot be confirmed, state the limitation and prefer direct execution. Same-model delegation can still help with independent verification or parallel throughput when justified. Describe its model and cost accordingly.
- Use an isolated worktree when changes might overlap or the worker needs a clean starting state. In a shared workspace, give each writer exclusive ownership of named files or modules. Sequence changes to shared interfaces, schemas, generated files, and tests. Launch workers concurrently only when their inputs and outputs are independent.

## Give a compact execution contract

Make the hard decisions before assigning implementation. Send just enough context for the worker to act independently, especially if it starts with an empty conversation. Each assignment should include:

1. **Outcome** — the deliverable and how it fits into the task.
2. **Decision and evidence** — the selected approach, relevant interfaces and paths, and facts the worker should rely on.
3. **Boundaries** — owned files, allowed tools and side effects, constraints, and which changes require escalation.
4. **Acceptance** — expected behavior, edge cases, exact checks when known, and the evidence to return.
5. **Stop condition** — the time or retry budget when known, escalation triggers, and a concise report of changes, commands, outputs, and unresolved issues.

Share decisions and relevant evidence without replaying extended reasoning. Let the worker choose routine implementation details inside the contract. Keep additional spawning disabled where available. Assign follow-on work from the supervisor so ownership and costs stay visible.

## Verify and intervene

- Treat worker summaries as leads. Inspect relevant diffs and integration points. Run the smallest deterministic check that proves each acceptance criterion, then cover regressions where the change could affect existing behavior. Verify every boundary before combining work from multiple writers.
- Use a separate verification worker when independence materially improves confidence. Supply the contract and changed artifacts, and ask for reproducible failures and test output. The supervisor resolves disagreements and decides whether the result can ship.
- If a worker fails, distinguish an unclear contract, a local implementation error, and a capability mismatch. Allow one bounded correction when failure evidence points to a specific fix. Otherwise recover directly or use a deliberately selected stronger worker when the benefit justifies the cost. Report a model override or fallback when it affects the user's cost expectations.
- Integrate accepted work, verify the combined result, and report the outcome, checks run, and material limitations. Treat model configuration as intent and record actual identity only when the harness or provider exposes it. Leave unavailable cost or usage evidence as unavailable.
