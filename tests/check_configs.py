"""Parse the Agent Skill and generated native worker profiles without inference."""

from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory
import tomllib

import yaml


ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / "skills" / "elegantly-delegated" / "SKILL.md"


def split_markdown(path):
    opening, metadata, body = path.read_text(encoding="utf-8").split("---", 2)
    assert not opening
    assert metadata.startswith("\n") and body.startswith("\n")
    return yaml.safe_load(metadata), body


def read_workers(destination, prefix, suffix):
    files = Path(destination) / prefix / "agents"
    paths = [files / f"ed-{role}{suffix}" for role in ("recon", "implement")]
    if suffix == ".toml":
        return [tomllib.loads(path.read_text(encoding="utf-8")) for path in paths]
    return [split_markdown(path)[0] for path in paths]


def verify():
    metadata, instructions = split_markdown(SKILL)
    assert list(ROOT.glob("skills/**/SKILL.md")) == [SKILL]
    assert metadata["name"] == SKILL.parent.name
    assert 1 <= len(metadata["description"]) <= 1024
    assert len(instructions.split()) < 1000

    configurations = {
        "claude-code": (".claude", ".md", "haiku"),
        "antigravity": (".agents", ".md", "flash"),
        "codex": (".codex", ".toml", "account-mini"),
        "opencode": (".opencode", ".md", "local/test-mini#low"),
        "cursor": (".cursor", ".md", "account-mini"),
        "copilot-cli": (".github", ".agent.md", "local/test-mini"),
    }
    with TemporaryDirectory(prefix="ed schema check ") as isolated:
        for target, (prefix, suffix, model) in configurations.items():
            workspace = Path(isolated) / target
            subprocess.run(
                ["node", "scripts/install.mjs", "--target", target, "--project", str(workspace),
                 "--worker-model", model],
                cwd=ROOT, check=True, capture_output=True, text=True,
            )
            recon, implement = read_workers(workspace, prefix, suffix)
            for role, entry in [("ed-recon", recon), ("ed-implement", implement)]:
                assert entry["description"] and entry["model"] == model, target
                if target == "opencode":
                    assert entry["mode"] == "subagent" and "name" not in entry
                    assert entry["permissions"][0] == {"action": "*", "resource": "*", "effect": "deny"}
                else:
                    assert entry["name"] == role, target
            if target == "claude-code":
                assert recon["tools"].split(", ") == ["Read", "Grep", "Glob"]
                assert set(implement["tools"].split(", ")) == {"Read", "Grep", "Glob", "Edit", "Write", "Bash"}
            if target == "antigravity":
                assert recon["subagent"] is True and recon["mainAgent"] is False
                assert recon["tools"] == ["view_file", "grep_search"]
                assert recon["commandExecutionPolicy"] == "off"
                assert implement["commandExecutionPolicy"] == "sandbox"
            if target == "codex":
                assert set(recon) == {"name", "description", "model", "developer_instructions"}
                assert "Do not change files" in recon["developer_instructions"]
            if target == "opencode":
                assert [rule["action"] for rule in recon["permissions"][1:]] == ["read", "glob", "grep"]
                assert implement["permissions"][-1] == {"action": "shell", "resource": "*", "effect": "ask"}
            if target == "cursor":
                assert recon["readonly"] is True and implement["readonly"] is False
            if target == "copilot-cli":
                assert recon["tools"] == ["read", "grep", "glob"]
                assert recon["model-policy"] == implement["model-policy"] == "required"
    print("Canonical Agent Skill YAML and six native worker configurations passed.")


if __name__ == "__main__":
    verify()
