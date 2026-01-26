from pathlib import Path
import sys


def append_to_environment(append_path: str):
    if append_path and append_path != "":
        resolve_path = Path(append_path).resolve().parent

        if resolve_path not in sys.path:
            sys.path.insert(0, str(resolve_path))
