"""AI Strategy Service for generating, modifying, and optimizing strategies."""

from __future__ import annotations

import json
import os
import re
from typing import Any, Dict, List, Optional, Tuple

import requests
from core.strategy.builtin_templates import get_builtin_strategy_templates
from core.strategy.validator import StrategyValidator

from api.prompts import (
    MODIFICATION_PROMPT,
    MODIFICATION_SYSTEM_PROMPT,
    OPTIMIZATION_PROMPT,
    OPTIMIZATION_SYSTEM_PROMPT,
    EXPLANATION_PROMPT,
    EXPLANATION_SYSTEM_PROMPT,
    FIX_PROMPT,
)
from api.prompts.optimization import DEFAULT_METRICS_TEMPLATE, METRICS_TEMPLATE

# LLM Configuration
LLM_API_URL = os.environ.get("LLM_API_URL", "")
LLM_API_KEY = os.environ.get("LLM_API_KEY", "")
LLM_MODEL = os.environ.get("LLM_MODEL", "default")

# Default timeout for LLM requests
LLM_TIMEOUT = 60  # seconds


class AIStrategyService:
    """Service for AI-powered strategy operations."""

    def __init__(self):
        self.validator = StrategyValidator()
        self._templates_cache = None

    def _get_templates(self) -> Dict[str, Any]:
        """Get all builtin templates as a dict keyed by name."""
        if self._templates_cache is None:
            templates = get_builtin_strategy_templates()
            self._templates_cache = {t.name: t for t in templates}
        return self._templates_cache

    def _call_llm(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
        max_retries: int = 2,
    ) -> str:
        """Call LLM API with retry logic."""
        if not LLM_API_URL or not LLM_API_KEY:
            raise ValueError("LLM_API_URL and LLM_API_KEY must be configured")

        headers = {
            "Authorization": f"Bearer {LLM_API_KEY}",
            "Content-Type": "application/json",
        }

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": LLM_MODEL,
            "messages": messages,
            "temperature": temperature,
            "stream": False,
        }

        last_error = None
        for attempt in range(max_retries + 1):
            try:
                response = requests.post(
                    f"{LLM_API_URL.rstrip('/')}/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=LLM_TIMEOUT,
                )
                response.raise_for_status()
                result = response.json()
                return result["choices"][0]["message"]["content"]
            except requests.exceptions.Timeout:
                last_error = f"LLM request timeout (attempt {attempt + 1})"
                if attempt < max_retries:
                    continue
            except requests.exceptions.RequestException as e:
                last_error = f"LLM request failed: {str(e)}"
                if attempt < max_retries:
                    continue
                raise
            except (KeyError, IndexError) as e:
                last_error = f"Invalid LLM response format: {str(e)}"
                raise ValueError(last_error)

        raise ValueError(last_error)

    def _extract_code_from_response(self, response: str) -> str:
        """Extract Python code from LLM response."""
        # Try to extract code from markdown code blocks
        code_block_pattern = r"```python\n(.*?)\n```"
        matches = re.findall(code_block_pattern, response, re.DOTALL)
        
        if matches:
            # Return the longest code block (usually the complete strategy)
            return max(matches, key=len).strip()
        
        # Try generic code block
        generic_code_pattern = r"```\n(.*?)\n```"
        matches = re.findall(generic_code_pattern, response, re.DOTALL)
        if matches:
            return max(matches, key=len).strip()
        
        # If no code blocks, return the whole response
        return response.strip()

    def _validate_and_fix(
        self, code: str, max_fix_attempts: int = 2
    ) -> Tuple[str, List[str], bool]:
        """Validate code and attempt to fix if invalid.
        
        Returns: (code, errors, is_valid)
        """
        # Initial validation
        result = self.validator.validate(code)
        if result.valid:
            return code, [], True

        errors = result.errors
        
        # Attempt to fix
        current_code = code
        for attempt in range(max_fix_attempts):
            if not errors:
                break
                
            fix_prompt = FIX_PROMPT.format(
                original_code=current_code,
                validation_errors="\n".join(f"- {e}" for e in errors),
            )
            
            try:
                fixed_response = self._call_llm(fix_prompt, temperature=0.2)
                current_code = self._extract_code_from_response(fixed_response)
                
                # Re-validate
                result = self.validator.validate(current_code)
                if result.valid:
                    return current_code, [], True
                errors = result.errors
            except Exception as e:
                # If fix fails, return original with errors
                break
        
        return current_code, errors, False

    def modify_strategy(
        self,
        template_name: str,
        requirements: str,
        temperature: float = 0.3,
    ) -> Dict[str, Any]:
        """Modify a strategy template based on user requirements.
        
        Args:
            template_name: Name of the builtin template to base on
            requirements: User's modification requirements in natural language
            temperature: LLM temperature (0.0-1.0)
            
        Returns:
            Dict with keys: code, changes, parameters_schema, is_valid, errors
        """
        # Get template
        templates = self._get_templates()
        if template_name not in templates:
            available = ", ".join(templates.keys())
            raise ValueError(f"Template '{template_name}' not found. Available: {available}")
        
        template = templates[template_name]
        
        # Extract class name from template code
        class_match = re.search(r"class\s+(\w+)\s*\(", template.code)
        class_name = class_match.group(1) if class_match else "Strategy"
        
        # Build prompt
        prompt = MODIFICATION_PROMPT.format(
            template_code=template.code.strip(),
            template_name=template.name,
            user_requirements=requirements,
            class_name=class_name,
        )
        
        # Call LLM
        response = self._call_llm(
            prompt,
            system_prompt=MODIFICATION_SYSTEM_PROMPT,
            temperature=temperature,
        )
        
        # Extract code
        code = self._extract_code_from_response(response)
        
        # Validate and fix
        code, errors, is_valid = self._validate_and_fix(code)
        
        # Extract changes description (from LLM response outside code blocks)
        changes = self._extract_changes(response)
        
        # Extract parameters schema
        parameters_schema = self._extract_parameters_schema(code)
        
        return {
            "code": code,
            "changes": changes,
            "parameters_schema": parameters_schema,
            "is_valid": is_valid,
            "errors": errors,
            "base_template": template_name,
        }

    def optimize_strategy(
        self,
        strategy_code: str,
        strategy_name: str,
        optimization_goal: str,
        backtest_metrics: Optional[Dict[str, Any]] = None,
        temperature: float = 0.3,
    ) -> Dict[str, Any]:
        """Optimize a strategy based on performance metrics and goals.
        
        Args:
            strategy_code: Current strategy code
            strategy_name: Strategy name
            optimization_goal: What to optimize for (e.g., "降低最大回撤", "提高夏普比率")
            backtest_metrics: Optional backtest results
            temperature: LLM temperature
            
        Returns:
            Dict with keys: code, analysis, suggestions, is_valid, errors
        """
        # Format metrics
        if backtest_metrics:
            metrics_str = METRICS_TEMPLATE.format(
                sharpe_ratio=backtest_metrics.get("sharpe_ratio", 0),
                max_drawdown=backtest_metrics.get("max_drawdown", 0),
                win_rate=backtest_metrics.get("win_rate", 0),
                total_return=backtest_metrics.get("total_return", 0),
                annual_return=backtest_metrics.get("annual_return", 0),
                total_trades=backtest_metrics.get("total_trades", 0),
                win_trades=backtest_metrics.get("win_trades", 0),
                loss_trades=backtest_metrics.get("loss_trades", 0),
            )
        else:
            metrics_str = DEFAULT_METRICS_TEMPLATE
        
        # Build prompt
        prompt = OPTIMIZATION_PROMPT.format(
            strategy_code=strategy_code,
            strategy_name=strategy_name,
            backtest_metrics=metrics_str,
            optimization_goal=optimization_goal,
        )
        
        # Call LLM
        response = self._call_llm(
            prompt,
            system_prompt=OPTIMIZATION_SYSTEM_PROMPT,
            temperature=temperature,
        )
        
        # Extract code
        code = self._extract_code_from_response(response)
        
        # Validate and fix
        code, errors, is_valid = self._validate_and_fix(code)
        
        # Parse analysis and suggestions
        analysis, suggestions = self._parse_optimization_response(response)
        
        return {
            "code": code,
            "analysis": analysis,
            "suggestions": suggestions,
            "is_valid": is_valid,
            "errors": errors,
        }

    def explain_strategy(
        self,
        strategy_code: str,
        strategy_name: str,
        output_format: str = "text",
    ) -> Dict[str, Any]:
        """Explain a strategy in plain language.
        
        Args:
            strategy_code: Strategy code to explain
            strategy_name: Strategy name
            output_format: "text" or "json"
            
        Returns:
            Dict with explanation fields
        """
        if output_format == "json":
            from api.prompts.explanation import EXPLANATION_JSON_PROMPT
            prompt = EXPLANATION_JSON_PROMPT.format(
                strategy_code=strategy_code,
            )
        else:
            prompt = EXPLANATION_PROMPT.format(
                strategy_code=strategy_code,
                strategy_name=strategy_name,
            )
        
        # Call LLM
        response = self._call_llm(
            prompt,
            system_prompt=EXPLANATION_SYSTEM_PROMPT,
            temperature=0.3,
        )
        
        if output_format == "json":
            try:
                # Try to parse as JSON
                explanation = json.loads(response)
                return {"explanation": explanation, "raw": response}
            except json.JSONDecodeError:
                # Fallback to text
                return {"explanation": {"error": "Failed to parse JSON"}, "raw": response}
        else:
            return {"explanation": response}

    def _extract_changes(self, response: str) -> List[str]:
        """Extract list of changes from LLM response."""
        changes = []
        
        # Look for change lists in various formats
        # Format 1: "修改1: ..." or "1. ..."
        change_patterns = [
            r"(?:修改|change|优化|optimization)[：:]\s*(.+?)(?=\n|$)",
            r"\d+[.、]\s*(.+?)(?=\n\d+[.、]|$)",
        ]
        
        for pattern in change_patterns:
            matches = re.findall(pattern, response, re.IGNORECASE | re.DOTALL)
            for match in matches:
                change = match.strip()
                if change and len(change) > 5:  # Filter out very short matches
                    changes.append(change)
        
        return changes[:5]  # Return top 5 changes

    def _extract_parameters_schema(self, code: str) -> Dict[str, Any]:
        """Extract parameter schema from strategy code."""
        import ast
        
        schema = {}
        try:
            tree = ast.parse(code)
            for node in ast.walk(tree):
                if isinstance(node, ast.ClassDef):
                    for item in node.body:
                        if isinstance(item, ast.Assign):
                            for target in item.targets:
                                if isinstance(target, ast.Name):
                                    # Skip private attributes
                                    if target.id.startswith("_"):
                                        continue
                                    
                                    # Infer type from default value
                                    default = item.value
                                    param_info = {
                                        "title": target.id.replace("_", " ").title(),
                                    }
                                    
                                    if isinstance(default, ast.Constant):
                                        if isinstance(default.value, bool):
                                            param_info.update({
                                                "type": "boolean",
                                                "default": default.value,
                                            })
                                        elif isinstance(default.value, (int, float)):
                                            param_info.update({
                                                "type": "number",
                                                "default": default.value,
                                            })
                                            # Add reasonable min/max for numbers
                                            if "ratio" in target.id.lower():
                                                param_info["minimum"] = 0.0
                                                param_info["maximum"] = 1.0
                                            elif "period" in target.id.lower():
                                                param_info["minimum"] = 1
                                                param_info["maximum"] = 500
                                        elif isinstance(default.value, str):
                                            param_info.update({
                                                "type": "string",
                                                "default": default.value,
                                            })
                                        else:
                                            continue
                                        
                                        schema[target.id] = param_info
                                    
        except SyntaxError:
            pass  # Return empty schema if parsing fails
        
        return schema

    def _parse_optimization_response(self, response: str) -> Tuple[str, List[str]]:
        """Parse optimization response into analysis and suggestions."""
        analysis = ""
        suggestions = []
        
        # Extract analysis section
        analysis_match = re.search(
            r"(?:###?\s*)?分析[：:]?(.*?)(?=###?\s*优化建议|###?\s*优化后代码|$)",
            response,
            re.DOTALL | re.IGNORECASE,
        )
        if analysis_match:
            analysis = analysis_match.group(1).strip()
        
        # Extract suggestions section
        suggestions_match = re.search(
            r"(?:###?\s*)?优化建议[：:]?(.*?)(?=###?\s*优化后代码|$)",
            response,
            re.DOTALL | re.IGNORECASE,
        )
        if suggestions_match:
            suggestions_text = suggestions_match.group(1).strip()
            # Parse numbered list
            suggestion_pattern = r"\d+[.、]\s*(.+?)(?=\n\d+[.、]|$)"
            suggestions = re.findall(suggestion_pattern, suggestions_text, re.DOTALL)
            suggestions = [s.strip() for s in suggestions if s.strip()]
        
        return analysis, suggestions


# Singleton instance
_ai_strategy_service: Optional[AIStrategyService] = None


def get_ai_strategy_service() -> AIStrategyService:
    """Get or create AI Strategy Service singleton."""
    global _ai_strategy_service
    if _ai_strategy_service is None:
        _ai_strategy_service = AIStrategyService()
    return _ai_strategy_service
