"""Create a draft GitHub pull request from drift agent mapper patch output."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path


def create_draft_pr(
    *,
    repo_root: Path,
    patch_path: Path,
    vendor: str,
    event_id: str,
    base_branch: str = "main",
) -> None:
    """Opens a draft PR via gh CLI — requires human review before merge."""
    if not patch_path.exists():
        raise FileNotFoundError(f"Patch file not found: {patch_path}")

    branch = f"drift/{vendor}-{event_id[:8]}"
    title = f"drift({vendor}): propose mapper patch for event {event_id[:8]}"
    body = (
        "## Drift agent proposal (human review required)\n\n"
        f"- Vendor: `{vendor}`\n"
        f"- Drift event: `{event_id}`\n"
        f"- Patch file: `{patch_path.relative_to(repo_root)}`\n\n"
        "**Do not merge without:**\n"
        "1. Reviewing the proposed mapper changes\n"
        "2. Running `npm run validate`\n"
        "3. Confirming against production payload shape\n"
    )

    mapper_target = repo_root / "src" / "mappers" / f"{vendor}.ts"
    if mapper_target.exists():
        mapper_target.write_text(patch_path.read_text(encoding="utf-8"), encoding="utf-8")

    commands = [
        ["git", "checkout", "-b", branch],
        ["git", "add", str(mapper_target), str(patch_path.parent)],
        ["git", "commit", "-m", title],
        ["git", "push", "-u", "origin", branch],
        [
            "gh",
            "pr",
            "create",
            "--draft",
            "--base",
            base_branch,
            "--title",
            title,
            "--body",
            body,
        ],
    ]

    for command in commands:
        result = subprocess.run(command, cwd=repo_root, capture_output=True, text=True)
        if result.returncode != 0:
            detail = result.stderr.strip() or result.stdout.strip()
            raise RuntimeError(f"Command failed ({' '.join(command)}): {detail}")

    print(f"[drift-agent] draft PR created for branch {branch}")


def main() -> int:
    if len(sys.argv) < 4:
        print(
            "Usage: python -m agents.drift_runner.github_pr <vendor> <event_id> <patch_path>",
            file=sys.stderr,
        )
        return 2

    vendor = sys.argv[1]
    event_id = sys.argv[2]
    patch_path = Path(sys.argv[3])
    repo_root = Path(os.environ.get("REPO_ROOT", Path(__file__).resolve().parents[2]))

    try:
        create_draft_pr(
            repo_root=repo_root,
            patch_path=patch_path,
            vendor=vendor,
            event_id=event_id,
        )
    except Exception as error:  # noqa: BLE001
        print(f"[error] {error}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
