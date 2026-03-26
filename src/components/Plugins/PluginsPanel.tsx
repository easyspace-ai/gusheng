import React, { useState, useEffect } from 'react'
import { PluginManager } from './PluginManager'
import { PluginPanelIntegration } from './PluginPanelIntegration'
import { usePluginPanels } from './PluginPanelIntegration'
import { PluginAPI } from '../../lib/plugins/api'
import type { Plugin } from '../../lib/plugins/types'
import { CheckSquare, Plus, Filter, Calendar } from 'lucide-react'

// 简单的 Todo 组件
function TodoPanel() {
  const [todos, setTodos] = useState([
    { id: 1, title: '完成插件系统测试', completed: false, priority: 'high' },
    { id: 2, title: '优化用户界面', completed: true, priority: 'medium' },
    { id: 3, title: '添加更多插件示例', completed: false, priority: 'low' }
  ])
  const [newTodo, setNewTodo] = useState('')
  const [filter, setFilter] = useState('all')

  const addTodo = () => {
    if (newTodo.trim()) {
      const todo = {
        id: Date.now(),
        title: newTodo.trim(),
        completed: false,
        priority: 'medium'
      }
      setTodos([...todos, todo])
      setNewTodo('')
    }
  }

  const toggleTodo = (id: number) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ))
  }

  const deleteTodo = (id: number) => {
    setTodos(todos.filter(todo => todo.id !== id))
  }

  const filteredTodos = todos.filter(todo => {
    if (filter === 'completed') return todo.completed
    if (filter === 'pending') return !todo.completed
    return true
  })

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <CheckSquare size={20} />
          Todo List
        </h2>
        
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            placeholder="添加新任务..."
            className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-background"
            onKeyPress={(e) => e.key === 'Enter' && addTodo()}
          />
          <button
            onClick={addTodo}
            className="px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="flex gap-2">
          {['all', 'pending', 'completed'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs rounded-md ${
                filter === f 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {f === 'all' ? '全部' : f === 'pending' ? '待办' : '已完成'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {filteredTodos.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            没有任务
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTodos.map(todo => (
              <div
                key={todo.id}
                className={`flex items-center gap-3 p-3 rounded-md border ${
                  todo.completed 
                    ? 'bg-muted/50 border-muted' 
                    : 'bg-background border-border'
                }`}
              >
                <button
                  onClick={() => toggleTodo(todo.id)}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    todo.completed
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-muted-foreground'
                  }`}
                >
                  {todo.completed && <CheckSquare size={12} />}
                </button>
                
                <span className={`flex-1 ${
                  todo.completed ? 'line-through text-muted-foreground' : ''
                }`}>
                  {todo.title}
                </span>
                
                <span className={`text-xs px-2 py-1 rounded ${
                  todo.priority === 'high' ? 'bg-red-100 text-red-800' :
                  todo.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {todo.priority === 'high' ? '高' : 
                   todo.priority === 'medium' ? '中' : '低'}
                </span>
                
                <button
                  onClick={() => deleteTodo(todo.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function PluginsPanel() {
  const [activeView, setActiveView] = useState<'manager' | 'plugin'>('manager')
  const [activePlugin, setActivePlugin] = useState<Plugin | null>(null)
  const [commandExecuted, setCommandExecuted] = useState(false)
  const leftPanels = usePluginPanels('left')

  // 监听插件命令执行事件，切换到插件面板
  useEffect(() => {
    const handleCommandExecute = (event: any) => {
      console.log('Command executed, switching to plugin view:', event)
      // 当插件命令执行时，切换到插件面板视图
      setActiveView('plugin')
      setCommandExecuted(true)
    }

    // 监听全局事件
    window.addEventListener('plugin:command-executed', handleCommandExecute)
    
    return () => {
      window.removeEventListener('plugin:command-executed', handleCommandExecute)
    }
  }, [])

  // 如果有插件面板，显示插件面板
  if (activeView === 'plugin' && leftPanels.length > 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="h-8 flex items-center px-3 border-b border-border">
          <button
            onClick={() => setActiveView('manager')}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ← 返回插件管理
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <PluginPanelIntegration position="left">
            {(panels) => (
              <div className="h-full">
                {panels.map(panel => (
                  <div key={panel.id} className="h-full">
                    <panel.component context={panel.context} />
                  </div>
                ))}
              </div>
            )}
          </PluginPanelIntegration>
        </div>
      </div>
    )
  }

  // 如果插件命令被执行但没有面板，显示简单的 Todo 界面
  if (activeView === 'plugin' && commandExecuted) {
    return (
      <div className="h-full flex flex-col">
        <div className="h-8 flex items-center px-3 border-b border-border">
          <button
            onClick={() => setActiveView('manager')}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ← 返回插件管理
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <TodoPanel />
        </div>
      </div>
    )
  }

  // 默认显示插件管理器
  return <PluginManager className="h-full" />
}