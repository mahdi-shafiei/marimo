# Copyright 2024 Marimo. All rights reserved.
from __future__ import annotations

import importlib.metadata
import subprocess
import sys
from typing import Optional

from marimo import _loggers

LOGGER = _loggers.marimo_logger()

TIMEOUT = 10  # seconds


def get_node_version() -> Optional[str]:
    try:
        process = subprocess.Popen(
            ["node", "--version"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        stdout, stderr = communicate_with_timeout(process)
        if stderr:
            return None
        if stdout and (stripped := stdout.strip()):
            return stripped.split()[-1]
        else:
            return None
    except FileNotFoundError:
        return None


def get_required_modules_list() -> dict[str, str]:
    packages = [
        "click",
        "docutils",
        "itsdangerous",
        "jedi",
        "markdown",
        "narwhals",
        "packaging",
        "psutil",
        "pygments",
        "pymdown-extensions",
        "pyyaml",
        "starlette",
        "tomlkit",
        "typing-extensions",
        "uvicorn",
        "websockets",
    ]
    return _get_versions(packages, include_missing=True)


def get_optional_modules_list() -> dict[str, str]:
    # List of common libraries we integrate with
    packages = [
        "altair",
        "anywidget",
        "duckdb",
        "ibis-framework",
        "nbformat",
        "openai",
        "opentelemetry",
        "pandas",
        "polars",
        "pyarrow",
        "loro",
        "pylsp-mypy",
        "pytest",
        "python-lsp-ruff",
        "python-lsp-server",
        "ruff",
        "sqlglot",
    ]
    return _get_versions(packages, include_missing=False)


def _get_versions(
    packages: list[str], include_missing: bool
) -> dict[str, str]:
    package_versions: dict[str, str] = {}
    # Consider listing all installed modules and their versions
    # Submodules and private modules are can be filtered with:
    #  if not ("." in m or m.startswith("_")):
    for package in packages:
        try:
            package_versions[package] = importlib.metadata.version(package)
        except importlib.metadata.PackageNotFoundError:
            if include_missing:
                package_versions[package] = "missing"

    return package_versions


def get_chrome_version() -> Optional[str]:
    def get_chrome_version_windows() -> Optional[str]:
        process = subprocess.Popen(
            [
                "reg",
                "query",
                "HKEY_CURRENT_USER\\Software\\Google\\Chrome\\BLBeacon",
                "/v",
                "version",
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        stdout, stderr = communicate_with_timeout(process)
        if stderr:
            return None
        parts = stdout.strip().split()
        if parts:
            return parts[-1]
        return None

    def get_chrome_version_mac() -> Optional[str]:
        process = subprocess.Popen(
            [
                "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
                "--version",
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        stdout, stderr = communicate_with_timeout(process)
        if stderr:
            return None
        parts = stdout.strip().split()
        if parts:
            return parts[-1]
        return None

    def get_chrome_version_linux() -> Optional[str]:
        process = subprocess.Popen(
            ["google-chrome", "--version"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        stdout, stderr = communicate_with_timeout(process)
        if stderr:
            return None
        parts = stdout.strip().split()
        if parts:
            return parts[-1]
        return None

    try:
        if sys.platform.startswith("win32"):
            return get_chrome_version_windows()
        elif sys.platform.startswith("darwin"):
            return get_chrome_version_mac()
        elif sys.platform.startswith("linux"):
            return get_chrome_version_linux()
        else:
            return None
    except FileNotFoundError:
        return None
    except Exception as e:
        LOGGER.error(f"An error occurred: {e}")
        return None


def get_python_version() -> str:
    return sys.version.split()[0]


def communicate_with_timeout(
    process: subprocess.Popen[str], timeout: float = TIMEOUT
) -> tuple[str, str]:
    try:
        return process.communicate(timeout=timeout)
    except subprocess.TimeoutExpired:
        process.kill()
        return "", "Error: Process timed out"
