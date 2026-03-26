from __future__ import annotations

import ast
from dataclasses import dataclass, field
from typing import List, Tuple


@dataclass
class ValidationResult:
    valid: bool
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


class StrategyValidator:
    """Validate user strategy code before execution."""

    FORBIDDEN_IMPORTS = {
        "os",
        "sys",
        "subprocess",
        "socket",
        "pathlib",
        "shutil",
        "ctypes",
    }

    @staticmethod
    def validate_syntax(code: str) -> Tuple[bool, str]:
        try:
            ast.parse(code)
            return True, ""
        except SyntaxError as exc:
            return False, f"Syntax error on line {exc.lineno}: {exc.msg}"

    @staticmethod
    def validate_structure(code: str) -> Tuple[bool, str]:
        try:
            tree = ast.parse(code)
            class_defs = [node for node in ast.walk(tree) if isinstance(node, ast.ClassDef)]
            if not class_defs:
                return False, "Strategy code must define a class"

            target_class = None
            for cls in class_defs:
                for base in cls.bases:
                    if isinstance(base, ast.Name) and base.id == "BaseStrategy":
                        target_class = cls
                        break
                    if isinstance(base, ast.Attribute) and base.attr == "BaseStrategy":
                        target_class = cls
                        break
                if target_class:
                    break

            if target_class is None:
                return False, "Strategy class must inherit BaseStrategy"

            methods = [node.name for node in target_class.body if isinstance(node, ast.FunctionDef)]
            if "on_bar" not in methods:
                return False, "Strategy class must implement on_bar"
            return True, ""
        except Exception as exc:
            return False, f"Validation failed: {exc}"

    @staticmethod
    def validate_safety(code: str) -> Tuple[bool, str]:
        try:
            tree = ast.parse(code)
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        if alias.name.split(".")[0] in StrategyValidator.FORBIDDEN_IMPORTS:
                            return False, f"Forbidden import: {alias.name}"
                if isinstance(node, ast.ImportFrom) and node.module:
                    if node.module.split(".")[0] in StrategyValidator.FORBIDDEN_IMPORTS:
                        return False, f"Forbidden import: {node.module}"
            return True, ""
        except Exception as exc:
            return False, f"Safety validation failed: {exc}"

    @classmethod
    def validate(cls, code: str) -> ValidationResult:
        errors: List[str] = []
        warnings: List[str] = []

        ok, msg = cls.validate_syntax(code)
        if not ok:
            errors.append(msg)

        ok, msg = cls.validate_structure(code)
        if not ok:
            errors.append(msg)

        ok, msg = cls.validate_safety(code)
        if not ok:
            errors.append(msg)

        return ValidationResult(valid=not errors, errors=errors, warnings=warnings)
