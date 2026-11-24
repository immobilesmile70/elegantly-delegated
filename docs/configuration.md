# Installation and model configuration

## Installer

Run `bash install.sh` on Linux, macOS, or WSL and `.\install.ps1` on Windows, from a checkout of this repository. Both forward to `node scripts/install.mjs`. Supply `--target NAME` or a comma-separated target list. Project scope defaults to the current directory. Use `--project PATH` to point at a different workspace, or `--global` to install once for the current user. Quote paths that contain spaces.

| Operation | Arguments after the installer |
| --- | --- |
| Show supported targets | `--list` |
| Inspect proposed writes | `--target codex,antigravity --project "../repo with spaces" --dry-run` |
| Install skill and configure one harness's workers | `--target claude-code --worker-model haiku` |
| Refresh the skill | Update the checkout, then rerun `--target claude-code` in the same scope |
| Refresh workers or change their model | Rerun with the desired `--worker-model` in the same scope |
| Remove managed skill and workers | `--target claude-code --uninstall` |
| Disable just the skill for an experiment | `--target claude-code --uninstall --only-skill` |

The worker model is explicit and applies to both installed roles. Set the supervisor model in the harness. To use a different model or effort for one worker, edit its native profile after installation. A normal skill refresh leaves the worker files alone. Explicit worker refreshes and full uninstall stop on locally edited or unmanaged files. Back up or move an edited profile before letting the installer recreate it, or keep managing it yourself.

The installer uses standalone files. Shared settings files, model catalogs, and other agents stay under the harness's management. Keep the local `.elegantly-delegated/install.json` receipt to allow verifiable updates and removals. The receipt contains paths and hashes. Exclude it from project commits when sharing installed profiles or evidence. If a process is interrupted, retry the same command. If a stale `install.lock` remains, remove it after checking the process has exited and retry.

Antigravity, Codex, Pi, and Amp share the same project skill path. A removal at that path removes it for every consumer. Other harnesses can discover it through compatibility paths. Use separate workspaces and check global copies when running controlled trials. The [path matrix](compatibility.md#paths-and-sources) lists the standard roots.

The installers reject symlinks and junctions inside installation paths. If an install made with `npx skills` or a manually copied skill occupies the same path, manage it with its original mechanism or move it before switching installers.

## Worker roles

| Role | Contract |
| --- | --- |
| `ed-recon` | Inspect a bounded area and report findings with file evidence. Read-only tool controls apply where the harness exposes one. |
| `ed-implement` | Implement an agreed change in owned files and run specified checks under the session's permissions. |

The supervisor performs deterministic integration checks. It can assign an independent artifact review to `ed-recon` and run commands itself. Both profiles instruct workers to stop at the assigned scope and leave spawning to the supervisor. Tool permissions, inherited session policies, and workspace isolation depend on the harness.

## Claude Code

1. Start Claude with `claude --model MODEL_ID` or choose the supervisor with `/model`.
2. Install with `--target claude-code --worker-model haiku`, substituting an available Claude alias or model ID. Personal paths default to `~/.claude` and use `CLAUDE_CONFIG_DIR` when set.
3. Open a fresh session. Check `/agents` for the installed profiles and use `/elegantly-delegated` when you want explicit activation.

The native worker profiles live in `.claude/agents/` or its user equivalent. Claude starts a custom worker with its own context. `ed-recon` allows Read, Grep, and Glob. `ed-implement` also allows editing and Bash under the effective session permission policy. The Agent tool remains outside both allowlists. Use foreground execution if the installed release restricts background tools needed by the task.

A per-invocation model alias can override the profile. Environment force settings, spawn hooks, model allowlists, and plan availability can affect the effective model. Set `effort` in the native profile when needed and check `/tasks` during execution for runtime model evidence. Different Claude deployment backends have their own model IDs. The profile has no portable per-worker provider control. [Subagents](https://code.claude.com/docs/en/sub-agents) · [Model configuration](https://code.claude.com/docs/en/model-config) · [Skills](https://code.claude.com/docs/en/skills)

## Google Antigravity

1. Use a current Antigravity App or the Antigravity CLI `agy`. Select the supervisor in the App picker or with `/model` in the CLI.
2. Install with `--target antigravity --worker-model flash`. The installer accepts `flash` or `pro` from the documented standalone custom-agent schema. Confirm the tiers on your installed version and plan.
3. Open a new conversation. Inspect the skill list and use `/elegantly-delegated` when you want explicit activation.

Project skills and workers go in `.agents/`. User files go in `~/.gemini/config/`, the shared path for the current App and CLI. The CLI has additional discovery paths with higher priority. The built-in `invoke_subagent` tool starts workers with fresh conversation context. It offers shared workspace and isolated worktree modes. `ed-recon` allows `view_file` and `grep_search` with command execution off. `ed-implement` uses the documented file and command tools with sandbox execution.

The profile requests a tier selected by Antigravity. The official custom-agent controls reviewed here expose tiers and omit arbitrary worker provider or model IDs. Capture runtime evidence if your version shows it. A configured `flash` tier and a spawned worker alone establish a configuration and a delegation event. [Skills](https://antigravity.google/docs/skills) · [Custom subagents](https://antigravity.google/docs/subagents) · [Discovery and precedence](https://antigravity.google/docs/customization-discovery)

## OpenAI Codex

1. Set the supervisor with `codex --model MODEL_ID` or select it with `/model`.
2. Install with `--target codex --worker-model MODEL_ID` using an exact ID available through the session provider.
3. Trust the test workspace for project configuration, open a fresh session, and use the skill picker or `$elegantly-delegated` for explicit activation. Use `/subagents` to inspect spawned threads.

Codex discovers skills in `.agents/skills/` and `~/.agents/skills/`. Profiles live in `.codex/agents/` or `$CODEX_HOME/agents/`, with user default `~/.codex/agents/`. The profile's `model` and optional `model_reasoning_effort` apply within the parent provider. Add effort when the inherited value is incompatible with the worker model. The documented `[agents]` configuration supports a default worker model, a default effort, and `max_concurrent_threads_per_session` in current releases. Earlier builds may use `max_threads`.

Workers inherit the parent's provider, sandbox, approval mode, and MCP servers in current local CLI documentation. `ed-recon` is instruction-only read-only in a writable session. Use a read-only parent/session for an enforced read-only pass. Send a compact contract and inspect the separate worker thread. Capture runtime model metadata wherever the installed client exposes it. [Skills](https://learn.chatgpt.com/docs/build-skills) · [Subagents and configuration](https://learn.chatgpt.com/docs/agent-configuration/subagents)

## OpenCode

1. Choose an available supervisor in `/models` or set the default `model` in OpenCode configuration.
2. With OpenCode V2, install with `--target opencode --worker-model PROVIDER/MODEL`. Use the actual ID from your connected provider catalog, with an optional `#variant` if available.
3. Open a fresh project session and ask it to use the `elegantly-delegated` skill. Check skill and subagent permissions and look for the skill invocation and child sessions.

The files use the V2 Markdown profile format and ordered permissions. The worker ID is its filename. The reconnaissance allowlist covers read, glob, and grep. The implementation profile also allows edits and asks for shell authorization. A final denial of recursive delegation is enforced by the initial deny-all rule and the specific allowlist. Subagents have their own sessions and receive their configured model or inherit the parent's model if none is set. Their providers can differ if both configurations resolve and applicable policy permits them. Check merged agent configuration and runtime evidence, especially when an extension modifies routing.

Default native paths are `.opencode/` and `~/.config/opencode/`. Run `opencode debug paths config` and install manually at the reported configuration root if it differs. For OpenCode V1, install the skill without `--worker-model` and use V1's own agent schema. Keep experimental baselines on the same major version. [V2 agents](https://opencode.ai/docs/agents/) · [Permissions](https://opencode.ai/docs/permissions/) · [Skills](https://opencode.ai/docs/skills/) · [Models](https://opencode.ai/docs/models/) · [Config precedence](https://opencode.ai/docs/config/)

## Additional harnesses

- Cursor packages Markdown workers with `model` and an explicit read-only flag for reconnaissance. Pass a plain account-enabled model ID with `--worker-model`. A project installation reaches the editor and CLI. User workers load in the editor or on a self-hosted worker. Check the subagent card and dashboard for effective model after any fallback. [Cursor subagents](https://cursor.com/docs/subagents)
- GitHub Copilot CLI packages `.agent.md` workers using a configured `provider/model` and `model-policy: required`. The documented local-provider workflow can pair a cloud supervisor with a local worker. Configure the provider with Copilot CLI before using it. [Custom agents and model setup](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/create-custom-agents-for-cli#delegating-focused-tasks-to-a-specific-model)
- For the other installer targets, use the native agent or extension controls linked from [the compatibility matrix](compatibility.md) when available. The skill can use native controls independently of how it was installed.

## Manual installation

Copy the [canonical skill directory](../skills/elegantly-delegated) into a documented skills directory as `elegantly-delegated/SKILL.md`. Restart or reload the harness. Remove the copy to disable it. Where only custom instructions or ordinary prompts are available, paste the skill body's Markdown into that surface. Keep the same task boundaries and have the supervisor verify the work. A person can relay a bounded contract to a separately configured worker session when automated delegation is unavailable. Record evidence for both sessions if evaluating that manual procedure.
