// Todo List Plugin Main Entry Point
class TodoListPlugin {
  constructor(manifest) {
    this.id = manifest.id;
    this.manifest = manifest;
    this.todos = [];
    this.nextId = 1;
    this.categories = ['Personal', 'Work', 'Shopping', 'Ideas'];
    this.priorities = ['low', 'medium', 'high', 'urgent'];
  }

  async onLoad(context) {
    this.context = context;
    this.logger = context.logger;
    
    this.logger.info('Todo List plugin loaded');
    
    // Load configuration and todos
    this.loadConfiguration();
    this.loadTodos();
    
    // Add todo panel
    this.addTodoPanel();
    
    // Set up auto-save
    this.setupAutoSave();
  }

  async onUnload(context) {
    this.logger.info('Todo List plugin unloaded');
    
    // Save todos before unloading
    this.saveTodos();
    
    // Clear auto-save interval
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    
    // Remove panels
    context.ui.removePanel(`${this.id}:todo-panel`);
  }

  // Command handlers
  showTodoList() {
    this.logger.info('Showing todo list');
    this.addTodoPanel();
    this.context.ui.showNotification('Todo list opened', 'info');
  }

  createTodo() {
    this.logger.info('Creating new todo');
    
    const title = prompt('Enter todo title:');
    if (title && title.trim()) {
      const todo = this.createTodoItem({
        title: title.trim(),
        priority: this.getConfig('defaultPriority', 'medium'),
        category: 'Personal'
      });
      
      this.addTodo(todo);
      this.context.ui.showNotification(`Todo created: ${title}`, 'success');
    }
  }

  toggleComplete() {
    this.logger.info('Toggle todo complete command triggered');
    // This would typically work with selected todo in the UI
    this.context.ui.showNotification('Select a todo to toggle completion', 'info');
  }

  insertTodoList() {
    this.logger.info('Inserting todo list in document');
    
    const activeFile = this.context.workspace.getActiveFile();
    if (!activeFile) {
      this.context.ui.showNotification('No active file to insert todo list', 'warning');
      return;
    }
    
    const todoListMarkdown = this.generateTodoListMarkdown();
    this.context.workspace.insertText(todoListMarkdown);
    this.context.ui.showNotification('Todo list inserted', 'success');
  }

  // Hook handlers
  scanForTodos(context, file) {
    if (file.path.endsWith('.md')) {
      this.logger.debug(`Scanning file for todos: ${file.path}`);
      // Scan for markdown todo items: - [ ] or - [x]
      const todoPattern = /^[\s]*-\s*\[([ x])\]\s*(.+)$/gm;
      const matches = [...file.content.matchAll(todoPattern)];
      
      matches.forEach(match => {
        const [, isComplete, title] = match;
        const existingTodo = this.findTodoByTitle(title.trim());
        
        if (!existingTodo) {
          const todo = this.createTodoItem({
            title: title.trim(),
            completed: isComplete === 'x',
            source: file.path,
            category: 'Document'
          });
          this.addTodo(todo);
        }
      });
    }
  }

  updateTodosFromFile(context, file) {
    // Update todos when file is modified
    if (file.path.endsWith('.md')) {
      this.scanForTodos(context, file);
    }
  }

  loadTodos() {
    const savedTodos = this.context.storage.get('todos') || [];
    this.todos = savedTodos;
    this.nextId = Math.max(...this.todos.map(t => t.id), 0) + 1;
    this.logger.info(`Loaded ${this.todos.length} todos`);
  }

  // Todo management methods
  createTodoItem(options = {}) {
    return {
      id: this.nextId++,
      title: options.title || '',
      description: options.description || '',
      completed: options.completed || false,
      priority: options.priority || 'medium',
      category: options.category || 'Personal',
      tags: options.tags || [],
      dueDate: options.dueDate || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: options.source || null, // File path if created from document
      ...options
    };
  }

  addTodo(todo) {
    this.todos.push(todo);
    this.saveTodos();
    this.logger.debug(`Added todo: ${todo.title}`);
  }

  updateTodo(id, updates) {
    const todo = this.todos.find(t => t.id === id);
    if (todo) {
      Object.assign(todo, updates, { updatedAt: new Date().toISOString() });
      this.saveTodos();
      this.logger.debug(`Updated todo: ${todo.title}`);
    }
  }

  deleteTodo(id) {
    const index = this.todos.findIndex(t => t.id === id);
    if (index !== -1) {
      const todo = this.todos[index];
      this.todos.splice(index, 1);
      this.saveTodos();
      this.logger.debug(`Deleted todo: ${todo.title}`);
    }
  }

  toggleTodoComplete(id) {
    const todo = this.todos.find(t => t.id === id);
    if (todo) {
      todo.completed = !todo.completed;
      todo.updatedAt = new Date().toISOString();
      if (todo.completed) {
        todo.completedAt = new Date().toISOString();
      } else {
        delete todo.completedAt;
      }
      this.saveTodos();
      this.logger.debug(`Toggled todo completion: ${todo.title}`);
    }
  }

  findTodoByTitle(title) {
    return this.todos.find(t => t.title.toLowerCase() === title.toLowerCase());
  }

  // UI methods
  addTodoPanel() {
    const panel = {
      id: `${this.id}:todo-panel`,
      title: 'Todo List',
      icon: 'check-square',
      position: this.getConfig('position', 'left'),
      component: this.createTodoComponent()
    };
    
    this.context.ui.addPanel(panel);
  }

  createTodoComponent() {
    return ({ context }) => {
      const [todos, setTodos] = React.useState(this.todos);
      const [filter, setFilter] = React.useState('all');
      const [newTodoTitle, setNewTodoTitle] = React.useState('');
      const [selectedCategory, setSelectedCategory] = React.useState('Personal');
      const [selectedPriority, setSelectedPriority] = React.useState('medium');

      // Update todos when plugin todos change
      React.useEffect(() => {
        const updateTodos = () => setTodos([...this.todos]);
        context.eventBus.on('todos:updated', updateTodos);
        return () => context.eventBus.off('todos:updated', updateTodos);
      }, []);

      const filteredTodos = todos.filter(todo => {
        switch (filter) {
          case 'active':
            return !todo.completed;
          case 'completed':
            return todo.completed;
          case 'high-priority':
            return todo.priority === 'high' || todo.priority === 'urgent';
          default:
            return true;
        }
      });

      const addNewTodo = () => {
        if (newTodoTitle.trim()) {
          const todo = this.createTodoItem({
            title: newTodoTitle.trim(),
            category: selectedCategory,
            priority: selectedPriority
          });
          
          this.addTodo(todo);
          setTodos([...this.todos]);
          setNewTodoTitle('');
          context.eventBus.emit('todos:updated');
        }
      };

      const toggleComplete = (id) => {
        this.toggleTodoComplete(id);
        setTodos([...this.todos]);
        context.eventBus.emit('todos:updated');
      };

      const deleteTodo = (id) => {
        this.deleteTodo(id);
        setTodos([...this.todos]);
        context.eventBus.emit('todos:updated');
      };

      const getPriorityColor = (priority) => {
        switch (priority) {
          case 'urgent':
            return 'text-red-600 dark:text-red-400';
          case 'high':
            return 'text-orange-600 dark:text-orange-400';
          case 'medium':
            return 'text-yellow-600 dark:text-yellow-400';
          default:
            return 'text-gray-600 dark:text-gray-400';
        }
      };

      return React.createElement('div', {
        className: 'p-4 space-y-4 h-full flex flex-col',
      }, [
        // Header with stats
        React.createElement('div', {
          key: 'header',
          className: 'border-b pb-3',
        }, [
          React.createElement('h3', {
            key: 'title',
            className: 'font-semibold text-lg',
          }, 'Todo List'),
          React.createElement('div', {
            key: 'stats',
            className: 'text-sm text-gray-600 dark:text-gray-400 mt-1',
          }, `${todos.filter(t => !t.completed).length} active, ${todos.filter(t => t.completed).length} completed`)
        ]),

        // Add new todo
        React.createElement('div', {
          key: 'add-todo',
          className: 'space-y-2',
        }, [
          React.createElement('input', {
            key: 'title-input',
            type: 'text',
            value: newTodoTitle,
            onChange: (e) => setNewTodoTitle(e.target.value),
            onKeyPress: (e) => e.key === 'Enter' && addNewTodo(),
            placeholder: 'Add new todo...',
            className: 'w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
          }),
          React.createElement('div', {
            key: 'todo-options',
            className: 'flex space-x-2',
          }, [
            React.createElement('select', {
              key: 'category-select',
              value: selectedCategory,
              onChange: (e) => setSelectedCategory(e.target.value),
              className: 'flex-1 px-2 py-1 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500',
            }, this.categories.map(cat => 
              React.createElement('option', { key: cat, value: cat }, cat)
            )),
            React.createElement('select', {
              key: 'priority-select',
              value: selectedPriority,
              onChange: (e) => setSelectedPriority(e.target.value),
              className: 'flex-1 px-2 py-1 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500',
            }, this.priorities.map(priority => 
              React.createElement('option', { key: priority, value: priority }, 
                priority.charAt(0).toUpperCase() + priority.slice(1)
              )
            )),
            React.createElement('button', {
              key: 'add-button',
              onClick: addNewTodo,
              className: 'px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600',
            }, 'Add')
          ])
        ]),

        // Filters
        React.createElement('div', {
          key: 'filters',
          className: 'flex space-x-1',
        }, [
          ['all', 'All'],
          ['active', 'Active'],
          ['completed', 'Done'],
          ['high-priority', 'High Priority']
        ].map(([value, label]) =>
          React.createElement('button', {
            key: value,
            onClick: () => setFilter(value),
            className: `px-2 py-1 text-xs rounded transition-colors ${
              filter === value 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`,
          }, label)
        )),

        // Todo list
        React.createElement('div', {
          key: 'todo-list',
          className: 'flex-1 overflow-y-auto space-y-2',
        }, filteredTodos.length === 0 ? 
          React.createElement('div', {
            className: 'text-center text-gray-500 py-8',
          }, 'No todos found') :
          filteredTodos.map(todo =>
            React.createElement('div', {
              key: todo.id,
              className: `border rounded p-3 space-y-2 ${todo.completed ? 'opacity-60' : ''}`,
            }, [
              React.createElement('div', {
                key: 'todo-header',
                className: 'flex items-start justify-between',
              }, [
                React.createElement('div', {
                  key: 'todo-content',
                  className: 'flex items-start space-x-2 flex-1',
                }, [
                  React.createElement('input', {
                    key: 'checkbox',
                    type: 'checkbox',
                    checked: todo.completed,
                    onChange: () => toggleComplete(todo.id),
                    className: 'mt-1',
                  }),
                  React.createElement('div', {
                    key: 'text',
                    className: 'flex-1',
                  }, [
                    React.createElement('div', {
                      key: 'title',
                      className: `text-sm ${todo.completed ? 'line-through' : ''}`,
                    }, todo.title),
                    todo.description && React.createElement('div', {
                      key: 'description',
                      className: 'text-xs text-gray-600 dark:text-gray-400 mt-1',
                    }, todo.description)
                  ])
                ]),
                React.createElement('button', {
                  key: 'delete',
                  onClick: () => deleteTodo(todo.id),
                  className: 'text-red-500 hover:text-red-700 text-xs p-1',
                }, '×')
              ]),
              React.createElement('div', {
                key: 'todo-meta',
                className: 'flex items-center justify-between text-xs text-gray-500',
              }, [
                React.createElement('div', {
                  key: 'meta-left',
                  className: 'flex items-center space-x-2',
                }, [
                  React.createElement('span', {
                    key: 'category',
                    className: 'bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded',
                  }, todo.category),
                  React.createElement('span', {
                    key: 'priority',
                    className: `px-2 py-1 rounded ${getPriorityColor(todo.priority)}`,
                  }, todo.priority)
                ]),
                React.createElement('span', {
                  key: 'date',
                }, new Date(todo.createdAt).toLocaleDateString())
              ])
            ])
          )
        )
      ]);
    };
  }

  // Utility methods
  generateTodoListMarkdown() {
    const activeTodos = this.todos.filter(t => !t.completed);
    const completedTodos = this.todos.filter(t => t.completed);
    
    let markdown = '## Todo List\n\n';
    
    if (activeTodos.length > 0) {
      markdown += '### Active Tasks\n\n';
      activeTodos.forEach(todo => {
        markdown += `- [ ] ${todo.title}`;
        if (todo.priority !== 'medium') {
          markdown += ` (${todo.priority})`;
        }
        markdown += '\n';
      });
      markdown += '\n';
    }
    
    if (completedTodos.length > 0 && this.getConfig('showCompleted', true)) {
      markdown += '### Completed Tasks\n\n';
      completedTodos.forEach(todo => {
        markdown += `- [x] ${todo.title}\n`;
      });
    }
    
    return markdown;
  }

  setupAutoSave() {
    // Auto-save every 30 seconds
    this.autoSaveInterval = setInterval(() => {
      this.saveTodos();
    }, 30000);
  }

  saveTodos() {
    this.context.storage.set('todos', this.todos);
    this.logger.debug(`Saved ${this.todos.length} todos`);
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
}

// Export plugin class
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TodoListPlugin;
} else {
  window.TodoListPlugin = TodoListPlugin;
}
