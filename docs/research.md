# Research notes

Frontier coding models can make consequential decisions, but running every search, edit, and check on the frontier model can consume premium inference unnecessarily. Delegation adds its own costs through context duplication, communication, review, and retries. The research question is whether a short, portable policy can preserve verified coding-task performance while reducing total inference cost, and whether it adds value over ordinary native delegation.

## Prior work

- MinionS has a frontier model decompose long-document reasoning into small tasks for a local model. Its reported cost and quality trade-offs apply to its evaluated setup. The supervisor–worker split motivates testing the equivalent decision boundary for coding. [Narayan et al., Minions](https://arxiv.org/abs/2502.15964)
- RouteLLM evaluates routing requests between models at different price and capability levels. Its routing objective motivates a cost-aware direct-execution threshold for this project. [Ong et al., RouteLLM](https://arxiv.org/abs/2406.18665)
- The scaling study found results depended on task structure. Additional coordination helped on some decomposable workloads and hurt sequential planning workloads. That motivates both an independent-module task and a deliberately trivial task in the pilot suite. [Kim et al., Towards a Science of Scaling Agent Systems](https://arxiv.org/abs/2512.08296)
- SkillsBench uses matched conditions and deterministic verifiers to measure procedural skills. Its experiments found that targeted skills improved its aggregate pass rate and that outcomes varied across configurations. The evaluation here applies matching and deterministic verification to a delegation policy. [SkillsBench](https://arxiv.org/abs/2602.12670)

## Contribution and architecture

The project contributes a cost-aware delegation policy packaged as a single Agent Skill for existing coding harnesses. The supervisor chooses direct work or a bounded assignment, selects a configured model, transfers decisions and acceptance criteria, and verifies the returned work. Native subagents execute the contracts. Selective escalation keeps rework bounded and leaves the supervisor accountable.

The distribution follows the Agent Skills standard and keeps one source for the policy. Ponytail demonstrates a compact skill and native distribution, Anti-Slop demonstrates multi-harness installation and manual fallback, and Superpowers demonstrates native packaging with common skill content. This repository uses standalone configurations to avoid changing shared settings files. [Agent Skills specification](https://agentskills.io/specification) · [Ponytail](https://github.com/DietrichGebert/ponytail) · [Anti-Slop](https://github.com/miqdadbadjuber/anti-slop) · [Superpowers](https://github.com/obra/superpowers) · [skills CLI](https://github.com/vercel-labs/skills)

## Evaluation and limits

Four conditions isolate different questions. Frontier-only and lightweight-only provide model baselines. Ordinary native delegation and skill-guided native delegation use the same supervisor and worker configurations so their paired difference measures the policy. Acceptance checks, regression tests, token and cost breakdowns, and latency capture both quality and efficiency. [Evaluation methodology](../benchmarks/methodology.md)

A small pilot is sensitive to model versions, training overlap, account policies, effective model fallbacks, and hardware or service variability. The bundled fixtures cover bounded changes and cannot establish generalization to larger repositories. Actual billing, subscription quotas, and API-equivalent estimates are reported separately. Native telemetry may leave some quantities unavailable.

The canonical skill, installer, fixtures, and verification scripts are implemented. Original live routing demonstrations and performance results are pending.
