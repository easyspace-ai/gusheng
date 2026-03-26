from __future__ import annotations

from contextlib import contextmanager
from types import ModuleType
from typing import Any, Optional, Type

from core.strategy.validator import StrategyValidator
from core.vnpy_compat import Bar as CompatBar, BaseStrategy as CompatBaseStrategy


@contextmanager
def _patched_strategy_module(base_class: type[Any], bar_type: type[Any]):
    import core.strategy.base as strategy_base_module

    original_base = getattr(strategy_base_module, "BaseStrategy")
    original_bar = getattr(strategy_base_module, "Bar")
    strategy_base_module.BaseStrategy = base_class
    strategy_base_module.Bar = bar_type
    try:
        yield
    finally:
        strategy_base_module.BaseStrategy = original_base
        strategy_base_module.Bar = original_bar


def load_strategy_class(
    code: str,
    class_name: Optional[str] = None,
    *,
    base_class: type[Any] = CompatBaseStrategy,
    bar_type: type[Any] = CompatBar,
) -> Type[Any]:
    """Compile user strategy code and return the first BaseStrategy subclass found."""
    validation = StrategyValidator.validate(code)
    if not validation.valid:
        raise ValueError("; ".join(validation.errors))

    namespace: dict[str, Any] = {}
    namespace["__name__"] = "__backtest_strategy__"
    with _patched_strategy_module(base_class=base_class, bar_type=bar_type):
        exec(compile(code, "<strategy>", "exec"), namespace, namespace)

    if class_name and class_name in namespace:
        return namespace[class_name]

    for value in namespace.values():
        try:
            if isinstance(value, type) and issubclass(value, base_class) and value is not base_class:
                return value
        except Exception:
            continue

    raise ValueError("No BaseStrategy subclass found")
