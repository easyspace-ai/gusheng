// Calculator Plugin Main Entry Point
class CalculatorPlugin {
  constructor(manifest) {
    this.id = manifest.id;
    this.manifest = manifest;
    this.history = [];
    this.isOpen = false;
  }

  async onLoad(context) {
    this.context = context;
    this.logger = context.logger;
    
    this.logger.info('Calculator plugin loaded');
    
    // Add calculator panel
    this.addCalculatorPanel();
    
    // Load user configuration
    this.loadConfiguration();
    
    // Set up hooks
    this.setupHooks();
  }

  async onUnload(context) {
    this.logger.info('Calculator plugin unloaded');
    
    // Clean up panels
    context.ui.removePanel(`${this.id}:calculator-panel`);
    
    // Save history
    this.saveHistory();
  }

  // Command handlers
  openCalculator() {
    this.logger.info('Opening calculator');
    this.isOpen = true;
    this.context.ui.showNotification('Calculator opened', 'info');
    
    // Add panel if not already added
    this.addCalculatorPanel();
  }

  insertCalculation() {
    this.logger.info('Insert calculation command triggered');
    
    // Get current selection
    const selection = this.context.workspace.getCurrentSelection();
    const activeFile = this.context.workspace.getActiveFile();
    
    if (!activeFile) {
      this.context.ui.showNotification('No active file to insert calculation', 'warning');
      return;
    }
    
    // Simple calculation insertion
    const calculation = prompt('Enter calculation (e.g., 2+2):');
    if (calculation) {
      try {
        const result = this.calculate(calculation);
        const text = `${calculation} = ${result}`;
        
        if (selection) {
          this.context.workspace.replaceSelection(text);
        } else {
          this.context.workspace.insertText(text);
        }
        
        this.addToHistory(calculation, result);
        this.context.ui.showNotification(`Calculation inserted: ${text}`, 'success');
      } catch (error) {
        this.context.ui.showNotification(`Invalid calculation: ${error.message}`, 'error');
      }
    }
  }

  // Hook handlers
  handleSelectionChange(context, selection) {
    // Auto-detect mathematical expressions in selection
    if (selection && selection.text) {
      const mathPattern = /^[\d+\-*/().\s]+$/;
      if (mathPattern.test(selection.text.trim())) {
        this.logger.debug('Mathematical expression detected in selection');
      }
    }
  }

  handleEditorChange(context, content) {
    // Detect inline calculations
    const calcPattern = /=\s*\?\s*$/gm;
    if (calcPattern.test(content)) {
      this.logger.debug('Calculation request detected in editor');
    }
  }

  // Helper methods
  addCalculatorPanel() {
    const panel = {
      id: `${this.id}:calculator-panel`,
      title: 'Calculator',
      icon: 'calculator',
      position: this.getConfig('position', 'right'),
      component: this.createCalculatorComponent()
    };
    
    this.context.ui.addPanel(panel);
  }

  createCalculatorComponent() {
    return ({ context }) => {
      const [display, setDisplay] = React.useState('0');
      const [previousValue, setPreviousValue] = React.useState(null);
      const [operation, setOperation] = React.useState(null);
      const [waitingForNewValue, setWaitingForNewValue] = React.useState(false);
      
      const inputNumber = (num) => {
        if (waitingForNewValue) {
          setDisplay(String(num));
          setWaitingForNewValue(false);
        } else {
          setDisplay(display === '0' ? String(num) : display + num);
        }
      };
      
      const inputOperation = (nextOperation) => {
        const inputValue = parseFloat(display);
        
        if (previousValue === null) {
          setPreviousValue(inputValue);
        } else if (operation) {
          const currentValue = previousValue || 0;
          const newValue = this.performCalculation(currentValue, inputValue, operation);
          
          setDisplay(String(newValue));
          setPreviousValue(newValue);
          this.addToHistory(`${currentValue} ${operation} ${inputValue}`, newValue);
        }
        
        setWaitingForNewValue(true);
        setOperation(nextOperation);
      };
      
      const calculate = () => {
        if (previousValue !== null && operation) {
          const inputValue = parseFloat(display);
          const newValue = this.performCalculation(previousValue, inputValue, operation);
          
          setDisplay(String(newValue));
          setPreviousValue(null);
          setOperation(null);
          setWaitingForNewValue(true);
          
          this.addToHistory(`${previousValue} ${operation} ${inputValue}`, newValue);
        }
      };
      
      const clear = () => {
        setDisplay('0');
        setPreviousValue(null);
        setOperation(null);
        setWaitingForNewValue(false);
      };
      
      return React.createElement('div', {
        className: 'p-4 space-y-4',
      }, [
        // Display
        React.createElement('div', {
          key: 'display',
          className: 'bg-gray-100 dark:bg-gray-800 p-3 rounded text-right text-xl font-mono',
        }, display),
        
        // Buttons
        React.createElement('div', {
          key: 'buttons',
          className: 'grid grid-cols-4 gap-2',
        }, [
          // Row 1
          React.createElement('button', {
            key: 'clear',
            onClick: clear,
            className: 'col-span-2 p-3 bg-red-500 text-white rounded hover:bg-red-600',
          }, 'Clear'),
          React.createElement('button', {
            key: 'divide',
            onClick: () => inputOperation('/'),
            className: 'p-3 bg-blue-500 text-white rounded hover:bg-blue-600',
          }, '÷'),
          React.createElement('button', {
            key: 'multiply',
            onClick: () => inputOperation('*'),
            className: 'p-3 bg-blue-500 text-white rounded hover:bg-blue-600',
          }, '×'),
          
          // Row 2
          React.createElement('button', {
            key: '7',
            onClick: () => inputNumber(7),
            className: 'p-3 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600',
          }, '7'),
          React.createElement('button', {
            key: '8',
            onClick: () => inputNumber(8),
            className: 'p-3 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600',
          }, '8'),
          React.createElement('button', {
            key: '9',
            onClick: () => inputNumber(9),
            className: 'p-3 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600',
          }, '9'),
          React.createElement('button', {
            key: 'subtract',
            onClick: () => inputOperation('-'),
            className: 'p-3 bg-blue-500 text-white rounded hover:bg-blue-600',
          }, '-'),
          
          // Row 3
          React.createElement('button', {
            key: '4',
            onClick: () => inputNumber(4),
            className: 'p-3 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600',
          }, '4'),
          React.createElement('button', {
            key: '5',
            onClick: () => inputNumber(5),
            className: 'p-3 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600',
          }, '5'),
          React.createElement('button', {
            key: '6',
            onClick: () => inputNumber(6),
            className: 'p-3 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600',
          }, '6'),
          React.createElement('button', {
            key: 'add',
            onClick: () => inputOperation('+'),
            className: 'p-3 bg-blue-500 text-white rounded hover:bg-blue-600',
          }, '+'),
          
          // Row 4
          React.createElement('button', {
            key: '1',
            onClick: () => inputNumber(1),
            className: 'p-3 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600',
          }, '1'),
          React.createElement('button', {
            key: '2',
            onClick: () => inputNumber(2),
            className: 'p-3 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600',
          }, '2'),
          React.createElement('button', {
            key: '3',
            onClick: () => inputNumber(3),
            className: 'p-3 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600',
          }, '3'),
          React.createElement('button', {
            key: 'equals',
            onClick: calculate,
            className: 'row-span-2 p-3 bg-green-500 text-white rounded hover:bg-green-600',
          }, '='),
          
          // Row 5
          React.createElement('button', {
            key: '0',
            onClick: () => inputNumber(0),
            className: 'col-span-2 p-3 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600',
          }, '0'),
          React.createElement('button', {
            key: 'decimal',
            onClick: () => {
              if (display.indexOf('.') === -1) {
                setDisplay(display + '.');
              }
            },
            className: 'p-3 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600',
          }, '.'),
        ]),
        
        // History
        this.getConfig('showHistory', true) && React.createElement('div', {
          key: 'history',
          className: 'border-t pt-4',
        }, [
          React.createElement('h4', {
            key: 'history-title',
            className: 'text-sm font-medium mb-2',
          }, 'History'),
          React.createElement('div', {
            key: 'history-list',
            className: 'space-y-1 max-h-32 overflow-y-auto text-xs',
          }, this.history.slice(-5).map((item, index) => 
            React.createElement('div', {
              key: index,
              className: 'text-gray-600 dark:text-gray-400',
            }, `${item.expression} = ${item.result}`)
          ))
        ])
      ]);
    };
  }

  performCalculation(firstValue, secondValue, operation) {
    switch (operation) {
      case '+':
        return firstValue + secondValue;
      case '-':
        return firstValue - secondValue;
      case '*':
        return firstValue * secondValue;
      case '/':
        return firstValue / secondValue;
      default:
        return secondValue;
    }
  }

  calculate(expression) {
    // Simple expression evaluator (be careful with eval in production)
    // This is a simplified version - in production, use a proper math parser
    const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
    if (sanitized !== expression) {
      throw new Error('Invalid characters in expression');
    }
    
    try {
      const result = Function('"use strict"; return (' + sanitized + ')')();
      return parseFloat(result.toFixed(this.getConfig('precision', 6)));
    } catch (error) {
      throw new Error('Invalid mathematical expression');
    }
  }

  addToHistory(expression, result) {
    this.history.push({
      expression,
      result,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 50 entries
    if (this.history.length > 50) {
      this.history = this.history.slice(-50);
    }
    
    this.saveHistory();
  }

  loadConfiguration() {
    const savedConfig = this.context.storage.get('config') || {};
    this.config = { ...this.manifest.config, ...savedConfig };
  }

  getConfig(key, defaultValue) {
    return this.config?.[key] ?? defaultValue;
  }

  setConfig(key, value) {
    if (!this.config) this.config = {};
    this.config[key] = value;
    this.context.storage.set('config', this.config);
  }

  saveHistory() {
    this.context.storage.set('history', this.history);
  }

  loadHistory() {
    this.history = this.context.storage.get('history') || [];
  }

  setupHooks() {
    // Set up plugin hooks if needed
    this.hooks = {
      onSelectionChange: this.handleSelectionChange.bind(this),
      onEditorChange: this.handleEditorChange.bind(this)
    };
  }
}

// Export plugin class
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CalculatorPlugin;
} else {
  window.CalculatorPlugin = CalculatorPlugin;
}
