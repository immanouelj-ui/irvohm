"""Compatibility entry point for the shared footer command."""
from pathlib import Path
import subprocess


def sync():
    script = Path(__file__).resolve().with_name('sync_footers.cjs')
    subprocess.run(['node', str(script)], check=True)


if __name__ == '__main__':
    sync()
