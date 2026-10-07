"""Pure path discovery shared by Phase 4 browser QA runners."""
from pathlib import Path


def resolve_project_root(script_file: str | Path) -> Path:
    """Find the checkout by stable project markers and reject incomplete roots."""
    script_path = Path(script_file).resolve()
    for candidate in script_path.parents:
        if (candidate / "package.json").is_file() and (candidate / "src").is_dir():
            return candidate
    raise AssertionError(
        f"Could not locate project root above {script_path}; expected package.json and src/"
    )


def assert_project_root(root: str | Path) -> Path:
    """Preflight guard against a plausible but wrong parent-directory index."""
    path = Path(root).resolve()
    assert (path / "package.json").is_file(), f"Missing project package.json: {path}"
    assert (path / "src").is_dir(), f"Missing project src/: {path}"
    return path
