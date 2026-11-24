# Harness compatibility

Documentation reviewed on **24 November 2026**. “Packaged” means the repository installer has a target for that file layout. “Requires configuration” means the feature depends on the harness version, account, model catalog, or local settings. Runtime capability is documented separately from original evidence.

## Primary experimental targets

| Harness | Skill installation | Native subagents | Automatic delegation | Independent worker model | Cross-provider delegation | Runtime model identity | Extension requirement |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Claude Code | Packaged | Supported | Supported | Requires configuration. Native alias or model ID | Per-worker provider control unavailable in the packaged workflow | `/tasks` on supported versions | None |
| Google Antigravity App and CLI | Packaged | Supported | Supported | Requires configuration. `flash` and `pro` tier selectors | No documented per-worker provider control | Actual model observability unverified. Tier and lifecycle evidence are separate | None for custom subagents |
| OpenAI Codex CLI | Packaged | Supported | Requires a direct request or applicable project or skill instruction | Requires configuration. Model and effort within the parent provider | Parent provider inherited | Use runtime thread or provider evidence if exposed by the client | None |
| OpenCode V2 | Packaged | Supported | Supported with subagent permissions | Requires configuration. `provider/model[#variant]` | Requires connected providers and compatible policies | Inspect child session and per-message model metadata or provider records | None |

OpenCode V1 is eligible for skill installation. Use the installed major version's native syntax for any custom agents. Antigravity documentation concerns Antigravity App and CLI. Gemini CLI has independent schemas and discovery paths. [Primary setup and sources](configuration.md)

## Additional compatibility

| Harness | Skill installation | Native subagents | Automatic delegation | Independent worker model | Cross-provider delegation | Runtime model identity | Extension requirement |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Cursor | Packaged | Supported | Supported | Packaged. Model IDs subject to plan and fallback | Requires account-supported models | Task card and usage dashboard | None. Use project workers in the CLI |
| GitHub Copilot CLI | Packaged | Supported | Supported | Packaged. Provider-qualified model with required policy | Documented cloud supervisor and configured local worker | Unverified here. Use local provider response or request records if exposed | None. Local provider requires configuration |
| Gemini CLI | Packaged | Supported | Supported | Requires native agent configuration | Remote A2A is a separate integration | Unverified | None for local custom agents |
| Pi Coding Agent | Packaged | Extension-dependent | Extension-dependent | Extension-dependent | Extension-dependent | Unverified | Subagent extension required for automatic delegation |
| Cline | Packaged | CLI and Desktop | CLI and Desktop | Uses the main agent model | Unavailable through the documented native subagent tool | No independent identity shown in the reviewed subagent guide | None on supported surfaces |
| Kilo Code | Packaged | Depends on surface and mode | Depends on surface and mode | Unverified | Unverified | Unverified | Use the edition's documented native features |
| Augment Code (Auggie) | Packaged | Supported | Supported | Requires native agent configuration | Per-worker provider control unverified | Unverified | None |
| Amp | Packaged | Supported | Supported for built-in agents | Extension-dependent for custom role models | Requires compatible model plugin | Unverified for custom models | Model plugins for custom roles |
| Qwen Code | Packaged | Supported | Supported | Requires native agent configuration | Requires supported auth type and model | Unverified | None for local agents |
| Oh My OpenAgent (formerly Oh My OpenCode) | OpenCode skill path | Extension-dependent | Extension-dependent | Extension model configuration | Extension provider configuration | Verify runtime and any fallback | Oh My OpenAgent |
| Roo Code | Manual for existing installs | Legacy orchestrator modes | Legacy orchestrator modes | Unverified | Unverified | Unverified | Roo Code extension |
| Windsurf / Devin | Manual via supported product's customization UI | Surface-dependent | Unverified | Unverified | Unverified | Unverified | Product-specific |
| TRAE | Manual through its Skills UI | Unverified for this integration | Unverified | Unverified | Unverified | Unverified | Product-specific |
| Generic prompt or custom instructions | Instruction-only | Harness-dependent | Harness-dependent | Manual relay if unavailable | Manual relay if available | Harness-dependent | None for instruction-only use |

## Paths and sources

Append `/elegantly-delegated/SKILL.md` to a skill root. Packaged paths below use standard locations. Additional discovery paths, overrides, and precedence depend on each harness. Use [the setup guide](configuration.md) for worker file formats and execution constraints.

| Target | Project skill root | User skill root | Documentation |
| --- | --- | --- | --- |
| `claude-code` | `.claude/skills` | `~/.claude/skills` or `$CLAUDE_CONFIG_DIR/skills` | [Skills](https://code.claude.com/docs/en/skills) · [Workers](https://code.claude.com/docs/en/sub-agents) |
| `antigravity` | `.agents/skills` | `~/.gemini/config/skills` | [Skills](https://antigravity.google/docs/skills) · [Discovery](https://antigravity.google/docs/customization-discovery) · [Workers](https://antigravity.google/docs/subagents) |
| `codex` | `.agents/skills` | `~/.agents/skills` | [Skills](https://learn.chatgpt.com/docs/build-skills) · [Workers](https://learn.chatgpt.com/docs/agent-configuration/subagents) |
| `opencode` | `.opencode/skills` | `~/.config/opencode/skills` | [Skills](https://opencode.ai/docs/skills/) · [Workers](https://opencode.ai/docs/agents/) · [V2 config](https://opencode.ai/docs/config/) |
| `cursor` | `.cursor/skills` | `~/.cursor/skills` | [Skills](https://cursor.com/docs/skills) · [Workers](https://cursor.com/docs/subagents) |
| `copilot-cli` | `.github/skills` | `~/.copilot/skills` | [Skills](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills) · [Workers](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/create-custom-agents-for-cli) |
| `gemini-cli` | `.gemini/skills` | `~/.gemini/skills` | [Skills](https://geminicli.com/docs/cli/skills/) · [Workers and A2A](https://geminicli.com/docs/core/subagents/) |
| `pi` | `.agents/skills` | `~/.agents/skills` | [Skills](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/skills.md) |
| `cline` | `.cline/skills` | `~/.cline/skills` | [Skills](https://docs.cline.bot/customization/skills) · [Workers](https://docs.cline.bot/features/subagents) |
| `kilo` | `.kilo/skills` | `~/.kilo/skills` | [Skills](https://kilo.ai/docs/customize/skills) |
| `augment` | `.augment/skills` | `~/.augment/skills` | [Skills](https://docs.augmentcode.com/cli/skills) · [Workers](https://docs.augmentcode.com/cli/subagents) |
| `amp` | `.agents/skills` | `~/.agents/skills` | [Skills and precedence](https://ampcode.com/docs/customize/skills) · [Models and subagents](https://ampcode.com/docs/models-and-subagents) |
| `qwen-code` | `.qwen/skills` | `~/.qwen/skills` | [Skills](https://qwenlm.github.io/qwen-code-docs/en/users/features/skills/) · [Workers](https://qwenlm.github.io/qwen-code-docs/en/users/features/sub-agents/) |
| Oh My OpenAgent | OpenCode path | OpenCode path | [Extension and routing](https://github.com/code-yeongyu/oh-my-openagent) |
| Roo Code | `.roo/skills` | `~/.roo/skills` | [Legacy skill discovery](https://roocodeinc.github.io/Roo-Code/features/skills/) · [Project status](https://github.com/RooCodeInc/Roo-Code) |
| Windsurf / Devin | Product customization UI | Product customization UI | [Current customization guide](https://docs.devin.ai/desktop/devin-local/customizations) |
| TRAE | Skills UI | Skills UI | [Official Skills walkthrough](https://www.trae.ai/blog/trae_tutorial_0115) |

## Validation status

| Harnesses | Installation smoke-test status | Live heterogeneous-delegation verification | Performance benchmarks |
| --- | --- | --- | --- |
| Claude Code, Antigravity, Codex, OpenCode | Isolated installer file and schema checks. Live client discovery pending | Pending | Pending |
| Cursor, Copilot CLI | Isolated installer file and schema checks. Live client discovery pending | Pending | Outside the initial study |
| Gemini CLI, Pi, Cline, Kilo, Augment, Amp, Qwen Code | Isolated skill file checks. Live client discovery pending | Pending | Outside the initial study |
| Oh My OpenAgent, Roo Code, Windsurf / Devin, TRAE | Manual routes documented. Smoke tests pending | Pending | Outside the initial study |
| Generic | Canonical package validated. Client-dependent manual installation | Unverified | Outside the initial study |

[Installer tests](../tests/install.test.mjs) exercise actual file writes, updates, and removals. [Live evaluation procedure](../test.md) specifies the evidence needed before promoting a status to Demonstrated or Benchmarked.
