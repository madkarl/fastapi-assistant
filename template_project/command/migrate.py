from pathlib import Path
import os
import sys
import ast
import subprocess

from core.settings import settings


def find_schemas(file_path: Path) -> list:
    with open(file_path, "r", encoding="utf-8") as f:
        source = f.read()

    tree = ast.parse(source)

    # First pass: collect all classes and their base class info
    class_bases = {}  # {class_name: [base_class_names]}
    class_has_table = {}  # {class_name: has_table_true}

    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            # Get base class names
            bases = []
            for base in node.bases:
                if isinstance(base, ast.Name):
                    bases.append(base.id)
                elif isinstance(base, ast.Attribute):
                    bases.append(base.attr)
            class_bases[node.name] = bases

            # Check if table=True is present
            has_table = False
            for keyword in node.keywords:
                if keyword.arg == "table":
                    if (
                        isinstance(keyword.value, ast.Constant)
                        and keyword.value.value is True
                    ):
                        has_table = True
                        break
            class_has_table[node.name] = has_table

    # Recursively check if a class inherits from SQLModel
    def inherits_sqlmodel(class_name: str, visited: set = None) -> bool:
        if visited is None:
            visited = set()
        if class_name in visited:
            return False
        visited.add(class_name)

        if class_name == "SQLModel":
            return True

        if class_name not in class_bases:
            return False

        for base in class_bases[class_name]:
            if base == "SQLModel" or inherits_sqlmodel(base, visited):
                return True
        return False

    # Find all classes that meet the criteria
    result = []
    for class_name, has_table in class_has_table.items():
        if has_table and inherits_sqlmodel(class_name):
            result.append(class_name)

    return result


def generate_imports(search_base: Path) -> list[str]:
    result = []

    for item in search_base.iterdir():
        if item.is_dir() and item.name != "core" and item.name != "__pycache__":
            schema_file = item.joinpath("schema.py")
            if not schema_file.exists():
                continue
            classes = find_schemas(schema_file)
            for clz in classes:
                result.append(f"from {item.name}.schema import {clz}")

    return result


def generate_imports_from_external_path(external_path: Path) -> list[str]:
    result = []

    # 遍历目录及子目录中所有py文件
    for py_file in external_path.rglob("*.py"):
        # 跳过 __pycache__ 目录
        if "__pycache__" in py_file.parts:
            continue

        print(f"find: {py_file}")
        classes = find_schemas(py_file)
        if not classes:
            continue

        # 包含external_path目录名作为模块前缀
        relative_path = py_file.relative_to(external_path.parent)
        module_path = str(relative_path.with_suffix("")).replace(os.sep, ".")

        for clz in classes:
            result.append(f"from {module_path} import {clz}")

    return result


def update_alembic_env(import_statements: list[str]) -> bool:
    """Write import statements to alembic/env.py file."""
    try:
        # Get alembic/env.py file path
        src_dir = os.path.dirname(os.path.abspath(__file__))
        project_dir = os.path.dirname(src_dir)
        env_py_path = os.path.join(project_dir, "alembic", "env.py")

        # Read env.py file content
        with open(env_py_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Locate marker positions
        start_marker = "### auto generate start ###"
        end_marker = "### auto generate end ###"

        start_pos = content.find(start_marker)
        end_pos = content.find(end_marker)

        if start_pos == -1 or end_pos == -1:
            print(f"Error: Markers not found in {env_py_path}")
            return False

        # Build new content
        start_part = content[: start_pos + len(start_marker) + 1]  # +1 for newline
        end_part = content[end_pos:]

        # Generate import statements section
        imports_part = (
            "\n".join(import_statements) + "\n" if import_statements else "\n"
        )

        # Combine new content
        new_content = start_part + imports_part + end_part

        # Write to file
        with open(env_py_path, "w", encoding="utf-8") as f:
            f.write(new_content)

        print(f"Updated {env_py_path} with {len(import_statements)} import statements")
        return True

    except Exception as e:
        print(f"Error updating alembic env.py: {e}")
        return False


def execute_alembic_commands(message: str) -> bool:
    """Execute alembic commands."""
    try:
        env = os.environ.copy()

        if settings.external_schema_path:
            external_parent = str(Path(settings.external_schema_path).resolve().parent)
            python_path = env.get("PYTHONPATH", "")
            env["PYTHONPATH"] = (
                f"{external_parent}{os.pathsep}{python_path}"
                if python_path
                else external_parent
            )

        # Execute alembic revision command
        revision_cmd = f'alembic revision --autogenerate -m "{message}"'
        print(f"Executing: {revision_cmd}")

        result = subprocess.run(
            revision_cmd, shell=True, capture_output=True, text=True, env=env
        )
        if result.returncode != 0:
            print(f"Error in revision: {result.stderr}")
            return False

        print(result.stdout)

        # Execute alembic upgrade command
        upgrade_cmd = "alembic upgrade head"
        print(f"Executing: {upgrade_cmd}")

        result = subprocess.run(
            upgrade_cmd, shell=True, capture_output=True, text=True, env=env
        )
        if result.returncode != 0:
            print(f"Error in upgrade: {result.stderr}")
            return False

        print(result.stdout)
        return True

    except Exception as e:
        print(f"Error executing alembic commands: {e}")
        return False


def migrate_database(message: str):
    # Get all SQLModel(table=True) classes and generate import statements
    search_base = Path(__file__).parent.parent
    imports = generate_imports(search_base)

    if settings.external_schema_path != "":
        external_base = Path(settings.external_schema_path).resolve()
        external_imports = generate_imports_from_external_path(external_base)
        imports.extend(external_imports)

    if len(imports):
        print(f"Detect {len(imports)} schemas:")
        for item in imports:
            print(f"  {item}")
    else:
        print("No SQLModel table classes found")
        return

    print("Updating alembic/env.py...")
    if not update_alembic_env(imports):
        print("Failed to update alembic/env.py")
        return

    print("Executing alembic commands...")
    if not execute_alembic_commands(message):
        print("Failed to execute alembic commands")
        return

    print("Done!")
