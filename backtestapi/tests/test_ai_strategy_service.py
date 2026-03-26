"""Tests for AI Strategy Service."""

import os
import sys
import unittest
from unittest.mock import MagicMock, patch

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.services.ai_strategy_service import AIStrategyService


class TestAIStrategyService(unittest.TestCase):
    """Test cases for AIStrategyService."""

    def setUp(self):
        """Set up test fixtures."""
        self.service = AIStrategyService()
        
        # Sample strategy code for testing
        self.sample_strategy = '''
from core.strategy.base import BaseStrategy, Bar


class TestStrategy(BaseStrategy):
    fast_period = 5
    slow_period = 13
    max_drawdown = 0.15

    def on_bar(self, bar: Bar):
        closes = self.get_close_prices(self.slow_period)
        if len(closes) < self.slow_period:
            return
        
        # Simple crossover logic
        if closes[-1] > closes[-2] and self.position == 0:
            self.buy(bar.close, 100)
        elif closes[-1] < closes[-2] and self.position > 0:
            self.sell(bar.close, self.position)
'''

    def test_extract_code_from_response(self):
        """Test code extraction from LLM response."""
        # Test with markdown code block
        response1 = '''
Here's the modified strategy:

```python
from core.strategy.base import BaseStrategy

class MyStrategy(BaseStrategy):
    pass
```

Hope this helps!
'''
        code1 = self.service._extract_code_from_response(response1)
        self.assertIn("class MyStrategy", code1)
        
        # Test with generic code block
        response2 = '''
```
class TestStrategy(BaseStrategy):
    def on_bar(self, bar):
        pass
```
'''
        code2 = self.service._extract_code_from_response(response2)
        self.assertIn("class TestStrategy", code2)
        
        # Test without code block
        response3 = "class PlainStrategy(BaseStrategy): pass"
        code3 = self.service._extract_code_from_response(response3)
        self.assertIn("PlainStrategy", code3)

    def test_extract_parameters_schema(self):
        """Test parameter schema extraction."""
        code = '''
from core.strategy.base import BaseStrategy

class TestStrategy(BaseStrategy):
    fast_period = 5
    slow_period = 13
    risk_ratio = 0.02
    enable_feature = True
    symbol = "AAPL"
    _private_var = 100
'''
        schema = self.service._extract_parameters_schema(code)
        
        # Check extracted parameters
        self.assertIn("fast_period", schema)
        self.assertEqual(schema["fast_period"]["type"], "number")
        self.assertEqual(schema["fast_period"]["default"], 5)
        
        self.assertIn("risk_ratio", schema)
        self.assertEqual(schema["risk_ratio"]["type"], "number")
        
        self.assertIn("enable_feature", schema)
        self.assertEqual(schema["enable_feature"]["type"], "boolean")
        
        # Private variable should not be included
        self.assertNotIn("_private_var", schema)

    def test_parse_optimization_response(self):
        """Test parsing optimization response."""
        response = '''
### 分析
策略在当前市场环境下表现一般，主要问题是回撤较大。

### 优化建议
1. 建议添加趋势过滤器，只在上升趋势中交易
2. 建议收紧止损比例
3. 建议增加成交量确认

### 优化后代码
```python
class OptimizedStrategy(BaseStrategy):
    pass
```
'''
        analysis, suggestions = self.service._parse_optimization_response(response)
        
        self.assertIn("回撤较大", analysis)
        self.assertEqual(len(suggestions), 3)
        self.assertIn("趋势过滤器", suggestions[0])

    def test_extract_changes(self):
        """Test extracting changes from response."""
        response = '''
修改1: 添加了RSI指标计算
修改2: 增加了成交量过滤条件

1. 优化了入场逻辑
2. 改进了止损机制
'''
        changes = self.service._extract_changes(response)
        
        self.assertTrue(len(changes) >= 2)

    def test_get_templates(self):
        """Test loading builtin templates."""
        templates = self.service._get_templates()
        
        # Check that templates are loaded
        self.assertIsInstance(templates, dict)
        self.assertGreater(len(templates), 0)
        
        # Check for expected templates
        template_names = list(templates.keys())
        print(f"Available templates: {template_names}")

    @patch.dict(os.environ, {
        "LLM_API_URL": "https://test.api.com/v1",
        "LLM_API_KEY": "test-key",
        "LLM_MODEL": "test-model"
    })
    def test_service_initialization(self):
        """Test service can be initialized with env vars."""
        service = AIStrategyService()
        self.assertIsNotNone(service)


class TestPromptTemplates(unittest.TestCase):
    """Test prompt templates."""

    def test_modification_prompt_format(self):
        """Test modification prompt can be formatted."""
        from api.prompts import MODIFICATION_PROMPT
        
        prompt = MODIFICATION_PROMPT.format(
            template_code="class Test(BaseStrategy): pass",
            template_name="Test Strategy",
            user_requirements="Add RSI filter",
            class_name="TestStrategy"
        )
        
        self.assertIn("Test Strategy", prompt)
        self.assertIn("Add RSI filter", prompt)
        self.assertIn("BaseStrategy", prompt)

    def test_optimization_prompt_format(self):
        """Test optimization prompt can be formatted."""
        from api.prompts import OPTIMIZATION_PROMPT
        from api.prompts.optimization import DEFAULT_METRICS_TEMPLATE
        
        prompt = OPTIMIZATION_PROMPT.format(
            strategy_code="class Test(BaseStrategy): pass",
            strategy_name="Test",
            backtest_metrics=DEFAULT_METRICS_TEMPLATE,
            optimization_goal="提高夏普比率"
        )
        
        self.assertIn("提高夏普比率", prompt)
        self.assertIn("BaseStrategy", prompt)


if __name__ == "__main__":
    unittest.main()
