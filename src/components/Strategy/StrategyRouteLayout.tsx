import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle2,
  Code2,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Workflow,
  Target,
} from 'lucide-react'
import { StrategyCopilot } from './Copilot'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { WorkbenchLayout } from '@/components/Layout/WorkbenchLayout'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores'
import {
  createStrategy,
  deleteStrategy,
  listStrategies,
  type StrategyJsonObject,
  type StrategyJsonValue,
  type StrategySummary,
  type StrategyValidateResponse,
  updateStrategy,
  validateStrategyCode,
} from '@/lib/strategyApi'

type StrategyEditorState = {
  name: string
  description: string
  version: string
  status: string
  tagsText: string
  code: string
  parametersSchemaText: string
  isTemplate: boolean
  templateType: string
}



const STRATEGY_TEMPLATE_CODE = `from core.strategy.base import BaseStrategy, Bar


class MyStrategy(BaseStrategy):
    fast_window = 5
    slow_window = 20

    def on_start(self):
        """策略启动时初始化状态。"""
        pass

    def on_bar(self, bar: Bar):
        """逐根 K 线执行交易逻辑。"""
        pass
`

function createEmptyEditorState(): StrategyEditorState {
  return {
    name: '未命名策略',
    description: '这里填写策略说明、适用场景和风控约束。',
    version: '1.0.0',
    status: 'active',
    tagsText: 'A股, 日频',
    code: STRATEGY_TEMPLATE_CODE,
    parametersSchemaText: JSON.stringify(
      {
        fast_window: {
          title: '快线窗口',
          type: 'number',
          default: 5,
          description: '短周期均线窗口',
        },
        slow_window: {
          title: '慢线窗口',
          type: 'number',
          default: 20,
          description: '长周期均线窗口',
        },
      },
      null,
      2,
    ),
    isTemplate: false,
    templateType: '',
  }
}

function strategyToEditorState(strategy: StrategySummary): StrategyEditorState {
  return {
    name: strategy.name,
    description: strategy.description || '',
    version: strategy.version || '1.0.0',
    status: strategy.status || 'active',
    tagsText: (strategy.tags || []).join(', '),
    code: strategy.code,
    parametersSchemaText: JSON.stringify(strategy.parameters_schema || {}, null, 2),
    isTemplate: Boolean(strategy.is_template),
    templateType: strategy.template_type || '',
  }
}

function parseTags(text: string): string[] {
  return text
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseSchema(text: string): { ok: true; value: StrategyJsonObject } | { ok: false; error: string } {
  const raw = text.trim()
  if (!raw) return { ok: true, value: {} }
  try {
    const parsed = JSON.parse(raw) as StrategyJsonValue
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, error: '参数 Schema 必须是 JSON 对象' }
    }
    return { ok: true, value: parsed as StrategyJsonObject }
  } catch {
    return { ok: false, error: '参数 Schema 不是合法的 JSON' }
  }
}

function selectedStatusTone(validation?: StrategyValidateResponse | null) {
  if (!validation) {
    return 'bg-slate-500/10 text-slate-700 border-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/20'
  }
  if (validation.valid) {
    return 'bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/20'
  }
  return 'bg-rose-500/10 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/20'
}

function formatTime(value?: string | null): string {
  if (!value) return '--'
  return value.slice(0, 19).replace('T', ' ')
}



export function StrategyRouteLayout() {
  const navigate = useNavigate()
  const isDarkMode = useAppStore((state) => state.isDarkMode)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const [strategies, setStrategies] = useState<StrategySummary[]>([])
  const [selectedStrategyId, setSelectedStrategyId] = useState<number | 'draft' | null>(null)
  const [editorState, setEditorState] = useState<StrategyEditorState>(createEmptyEditorState)
  const [listLoading, setListLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [saveLoading, setSaveLoading] = useState(false)
  const [validateLoading, setValidateLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [validation, setValidation] = useState<StrategyValidateResponse | null>(null)
  const [actionMessage, setActionMessage] = useState('准备好创建或编辑策略。')
  const [actionError, setActionError] = useState<string | null>(null)
  const [searchText, setSearchText] = useState('')
  const [dirty, setDirty] = useState(false)
  const selectedStrategyIdRef = useRef<number | 'draft' | null>(null)

  const selectedStrategy = useMemo(
    () => (typeof selectedStrategyId === 'number' ? strategies.find((item) => item.id === selectedStrategyId) || null : null),
    [selectedStrategyId, strategies],
  )

  const filteredStrategies = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()
    if (!keyword) return strategies
    return strategies.filter((strategy) => {
      const haystack = [
        strategy.name,
        strategy.version,
        strategy.status,
        strategy.description,
        strategy.code,
        ...(strategy.tags || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(keyword)
    })
  }, [searchText, strategies])

  const activeStrategyLabel = selectedStrategyId === 'draft' ? editorState.name : selectedStrategy?.name
  const editorTheme = isDarkMode ? 'vs-dark' : 'light'

  useEffect(() => {
    selectedStrategyIdRef.current = selectedStrategyId
  }, [selectedStrategyId])

  const openDraft = useCallback(() => {
    setSelectedStrategyId('draft')
    setEditorState(createEmptyEditorState())
    setValidation(null)
    setActionError(null)
    setActionMessage('已创建本地草稿，填写内容后点击创建。')
    setDirty(false)
  }, [])

  const openStrategy = useCallback((strategy: StrategySummary) => {
    setSelectedStrategyId(strategy.id)
    setEditorState(strategyToEditorState(strategy))
    setValidation(null)
    setActionError(null)
    setActionMessage(`已载入策略：${strategy.name}`)
    setDirty(false)
  }, [])

  const cloneStrategyToDraft = useCallback((strategy: StrategySummary) => {
    setSelectedStrategyId('draft')
    setEditorState({
      ...strategyToEditorState(strategy),
      name: `${strategy.name} 副本`,
      version: strategy.version || '1.0.0',
      isTemplate: false,
      templateType: '',
    })
    setValidation(null)
    setActionError(null)
    setActionMessage(`已基于「${strategy.name}」创建草稿。`)
    setDirty(true)
  }, [])

  const refreshStrategies = useCallback(
    async (preferredId?: number | 'draft' | null) => {
      setListLoading(true)
      setListError(null)
      try {
        const rows = await listStrategies({ limit: 200 })
        setStrategies(rows)

        if (preferredId === 'draft') {
          openDraft()
          return rows
        }

        if (typeof preferredId === 'number') {
          const preferred = rows.find((item) => item.id === preferredId)
          if (preferred) {
            openStrategy(preferred)
            return rows
          }
        }

        if (rows.length > 0 && selectedStrategyIdRef.current === null) {
          openStrategy(rows[0])
        } else if (!rows.length) {
          openDraft()
        }

        return rows
      } catch (error) {
        setListError(error instanceof Error ? error.message : '加载策略失败')
        setStrategies([])
        if (typeof preferredId === 'number') {
          setSelectedStrategyId(preferredId)
        } else if (selectedStrategyIdRef.current === null) {
          openDraft()
        }
        return []
      } finally {
        setListLoading(false)
      }
    },
    [openDraft, openStrategy],
  )

  useEffect(() => {
    void refreshStrategies()
  }, [refreshStrategies])

  const updateEditorState = <K extends keyof StrategyEditorState>(key: K, value: StrategyEditorState[K]) => {
    setEditorState((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  const onSelectStrategy = (strategy: StrategySummary) => {
    openStrategy(strategy)
  }

  const onCreateDraft = () => {
    openDraft()
  }

  const strategySections = useMemo(() => {
    const builtins = filteredStrategies.filter((strategy) => strategy.is_template)
    const custom = filteredStrategies.filter((strategy) => !strategy.is_template)
    return { builtins, custom }
  }, [filteredStrategies])

  const onValidate = async () => {
    setValidateLoading(true)
    setActionError(null)
    try {
      const result = await validateStrategyCode(editorState.code)
      setValidation(result)
      setActionMessage(result.valid ? '策略校验通过。' : '策略存在校验错误，请修复后再保存。')
      setDirty(true)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '校验失败')
    } finally {
      setValidateLoading(false)
    }
  }

  const onSave = async () => {
    setSaveLoading(true)
    setActionError(null)
    try {
      const schemaResult = parseSchema(editorState.parametersSchemaText)
      if (!schemaResult.ok) {
        setActionError(schemaResult.error)
        setSaveLoading(false)
        return
      }

      const payload = {
        name: editorState.name.trim(),
        code: editorState.code,
        description: editorState.description.trim() || null,
        tags: parseTags(editorState.tagsText),
        parameters_schema: schemaResult.value,
        version: editorState.version.trim() || '1.0.0',
        is_template: editorState.isTemplate,
        template_type: editorState.templateType.trim() || null,
        status: editorState.status,
      }

      if (!payload.name) {
        setActionError('策略名称不能为空')
        setSaveLoading(false)
        return
      }

      if (selectedStrategyId === 'draft' || selectedStrategyId === null) {
        const created = await createStrategy({
          ...payload,
          language: 'python',
        })
        setActionMessage(`已创建策略：${created.name}`)
        setDirty(false)
        setSelectedStrategyId(created.id)
        await refreshStrategies(created.id)
      } else {
        const updated = await updateStrategy(selectedStrategyId, payload)
        setActionMessage(`已保存策略：${updated.name}`)
        setDirty(false)
        await refreshStrategies(updated.id)
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSaveLoading(false)
    }
  }

  const onDelete = async () => {
    if (selectedStrategyId === 'draft') {
      openDraft()
      return
    }

    if (selectedStrategyId === null) return
    const strategy = selectedStrategy
    const confirmed = window.confirm(`确认删除策略「${strategy?.name || selectedStrategyId}」吗？`)
    if (!confirmed) return

    setDeleteLoading(true)
    setActionError(null)
    try {
      await deleteStrategy(selectedStrategyId)
      setActionMessage('已删除策略。')
      setDirty(false)
      await refreshStrategies(null)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '删除失败')
    } finally {
      setDeleteLoading(false)
    }
  }

  const onGoBacktest = () => {
    const symbol = '600519.SH'
    const strategyQuery = typeof selectedStrategyId === 'number' ? `&strategy_id=${selectedStrategyId}` : ''
    navigate(`/backtest?symbol=${encodeURIComponent(symbol)}${strategyQuery}`)
  }

  // Remove legacy chat functions that are now handled by StrategyCopilot
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _unusedLegacyFunctions = null

  const onReset = () => {
    if (selectedStrategyId === 'draft' || selectedStrategyId === null) {
      openDraft()
      return
    }
    if (selectedStrategy) {
      openStrategy(selectedStrategy)
    }
  }

  const validationTone = selectedStatusTone(validation)
  const leftPanel = (
    <div className="flex h-full flex-col bg-[#fbfcfd] dark:bg-slate-950">
      <div className="border-b border-slate-200 bg-[#f6f7f9] px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
        <div className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">策略</div>
      </div>

      <div className="border-b border-slate-200 px-3 py-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <button
            onClick={onCreateDraft}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700"
            title="新建策略"
          >
            <Plus size={16} />
          </button>
          <button
            onClick={() => searchInputRef.current?.focus()}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700"
            title="搜索策略"
          >
            <Search size={16} />
          </button>
        </div>
        <div className="mt-3">
          <Input
            ref={searchInputRef}
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            className="h-10 rounded-lg border-slate-200 bg-white text-[13px] shadow-none focus-visible:ring-0 dark:border-slate-800 dark:bg-slate-900"
            placeholder="搜索策略..."
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-3">
          {listError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
              {listError}
            </div>
          ) : null}

          {selectedStrategyId === 'draft' ? (
            <button
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-left transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800/60"
              onClick={onCreateDraft}
            >
              <div className="flex items-center justify-between">
                <div className="text-[13px] font-medium text-slate-800 dark:text-slate-100">未保存草稿</div>
                <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  Draft
                </span>
              </div>
              <div className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">点击继续编辑当前草稿。</div>
            </button>
          ) : null}

          <div className="space-y-5">
            {listLoading ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-white p-4 text-[13px] text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                正在加载策略列表...
              </div>
            ) : null}

            {strategySections.builtins.length ? (
              <section className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <div className="text-[12px] font-medium text-slate-400 dark:text-slate-500">模板策略</div>
                  <div className="text-[11px] text-slate-400">{strategySections.builtins.length}</div>
                </div>
                {strategySections.builtins.map((strategy) => {
                  const active = strategy.id === selectedStrategyId
                  return (
                    <div
                      key={strategy.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectStrategy(strategy)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          onSelectStrategy(strategy)
                        }
                      }}
                      className={cn(
                        'w-full rounded-lg border px-3 py-2 text-left transition-colors outline-none',
                        active
                          ? 'border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-800/80'
                          : 'border-transparent bg-transparent hover:border-slate-200 hover:bg-white dark:hover:border-slate-800 dark:hover:bg-slate-900',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-medium text-slate-800 dark:text-slate-100">{strategy.name}</div>
                          <div className="mt-1 line-clamp-2 text-[12px] leading-5 text-slate-500 dark:text-slate-400">系统模板，可复制后再修改。</div>
                        </div>
                        <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">模板</span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            cloneStrategyToDraft(strategy)
                          }}
                          className="inline-flex h-7 items-center rounded-md border border-slate-200 bg-white px-2.5 text-[11px] font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                        >
                          复制
                        </button>
                      </div>
                    </div>
                  )
                })}
              </section>
            ) : null}

            {strategySections.custom.length ? (
              <section className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <div className="text-[12px] font-medium text-slate-400 dark:text-slate-500">我的策略</div>
                  <div className="text-[11px] text-slate-400">{strategySections.custom.length}</div>
                </div>
                {strategySections.custom.map((strategy) => {
                  const active = strategy.id === selectedStrategyId
                  return (
                    <div
                      key={strategy.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectStrategy(strategy)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          onSelectStrategy(strategy)
                        }
                      }}
                      className={cn(
                        'w-full rounded-lg border px-3 py-2 text-left transition-colors outline-none',
                        active
                          ? 'border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-800/80'
                          : 'border-transparent bg-transparent hover:border-slate-200 hover:bg-white dark:hover:border-slate-800 dark:hover:bg-slate-900',
                      )}
                    >
                      <div className="truncate text-[13px] font-medium text-slate-800 dark:text-slate-100">{strategy.name}</div>
                      <div className="mt-1 line-clamp-2 text-[12px] leading-5 text-slate-500 dark:text-slate-400">
                        {strategy.description || '无策略说明'}
                      </div>
                      <div className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                        {strategy.version ? `v${strategy.version}` : '未标记版本'}
                      </div>
                    </div>
                  )
                })}
              </section>
            ) : null}

            {!listLoading && !filteredStrategies.length && !listError ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-white p-4 text-[13px] text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                没有匹配的策略，点击左上角新建。
              </div>
            ) : null}
          </div>
        </div>
      </ScrollArea>
    </div>
  )

  const mainPanel = (
    <div className="flex h-full min-w-0 flex-col bg-white dark:bg-slate-950">
      <div className="border-b border-slate-200 bg-[#f6f7f9] px-5 py-3 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold text-slate-800 dark:text-slate-100">
              {activeStrategyLabel || '未命名策略'}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400">
              <span>{selectedStrategyId === 'draft' ? '草稿' : '策略文件'}</span>
              <span>·</span>
              <span>{dirty ? '未保存修改' : '已同步'}</span>
              <span>·</span>
              <span>{selectedStrategy?.updated_at ? `更新于 ${formatTime(selectedStrategy.updated_at)}` : '等待保存'}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onSave}
              disabled={saveLoading || validateLoading || deleteLoading}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-700"
            >
              {saveLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {selectedStrategyId === 'draft' || selectedStrategyId === null ? '创建' : '保存'}
            </button>
            <button
              onClick={onValidate}
              disabled={validateLoading || saveLoading || deleteLoading}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-700"
            >
              {validateLoading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
              校验
            </button>
            <button
              onClick={onReset}
              disabled={saveLoading || validateLoading || deleteLoading}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-700"
            >
              <RefreshCw size={14} />
              重置
            </button>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-5">
          {actionError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
              {actionError}
            </div>
          ) : null}

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
          >
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <div>
                <div className="text-[13px] font-medium text-slate-700 dark:text-slate-200">策略信息</div>
              </div>
              <div className="flex items-center gap-2 rounded-md border border-slate-200 px-2.5 py-1 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <Workflow size={14} />
                {selectedStrategyId === 'draft' ? '草稿模式' : '数据库策略'}
              </div>
            </div>

            <div className="grid gap-3 p-4 xl:grid-cols-2">
              <label className="space-y-1">
                <span className="text-[12px] text-slate-500 dark:text-slate-400">策略名称</span>
                <Input
                  value={editorState.name}
                  onChange={(event) => updateEditorState('name', event.target.value)}
                  className="h-10 rounded-lg border-slate-200 bg-white text-[13px] shadow-none focus-visible:ring-0 dark:border-slate-800 dark:bg-slate-900"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[12px] text-slate-500 dark:text-slate-400">版本</span>
                <Input
                  value={editorState.version}
                  onChange={(event) => updateEditorState('version', event.target.value)}
                  className="h-10 rounded-lg border-slate-200 bg-white text-[13px] shadow-none focus-visible:ring-0 dark:border-slate-800 dark:bg-slate-900"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[12px] text-slate-500 dark:text-slate-400">状态</span>
                <select
                  value={editorState.status}
                  onChange={(event) => updateEditorState('status', event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none transition focus:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="active">active</option>
                  <option value="disabled">disabled</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-[12px] text-slate-500 dark:text-slate-400">标签</span>
                <Input
                  value={editorState.tagsText}
                  onChange={(event) => updateEditorState('tagsText', event.target.value)}
                  className="h-10 rounded-lg border-slate-200 bg-white text-[13px] shadow-none focus-visible:ring-0 dark:border-slate-800 dark:bg-slate-900"
                  placeholder="逗号分隔，例如：趋势, 日频, 均线"
                />
              </label>
              <label className="space-y-1 xl:col-span-2">
                <span className="text-[12px] text-slate-500 dark:text-slate-400">策略说明</span>
                <Textarea
                  value={editorState.description}
                  onChange={(event) => updateEditorState('description', event.target.value)}
                  className="min-h-24 rounded-lg border-slate-200 bg-white text-[13px] shadow-none focus-visible:ring-0 dark:border-slate-800 dark:bg-slate-900"
                />
              </label>
            </div>
          </motion.div>

          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <div className="text-[13px] font-medium text-slate-700 dark:text-slate-200">源码</div>
              <div className="flex items-center gap-2 rounded-md border border-slate-200 px-2.5 py-1 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <Code2 size={14} />
                Python
              </div>
            </div>
            <div className="overflow-hidden">
              <Editor
                height="500px"
                language="python"
                theme={editorTheme}
                value={editorState.code}
                onChange={(value) => updateEditorState('code', value || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineHeight: 22,
                  fontLigatures: true,
                  wordWrap: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 16, bottom: 16 },
                }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <div>
                <div className="text-[13px] font-medium text-slate-700 dark:text-slate-200">参数配置</div>
              </div>
              <div className="flex items-center gap-2 rounded-md border border-slate-200 px-2.5 py-1 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <Target size={14} />
                JSON
              </div>
            </div>
            <div className="p-4">
              <Textarea
                value={editorState.parametersSchemaText}
                onChange={(event) => updateEditorState('parametersSchemaText', event.target.value)}
                className="min-h-40 rounded-lg border-slate-200 bg-white font-mono text-[12px] shadow-none focus-visible:ring-0 dark:border-slate-800 dark:bg-slate-900"
              />
              <div className="mt-2 text-[12px] leading-5 text-slate-500 dark:text-slate-400">
                这里保存 JSON 对象，回测页会根据它自动生成参数输入项。
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                <div className="text-[13px] font-medium text-slate-700 dark:text-slate-200">校验结果</div>
                <div className={cn('rounded-md border px-2 py-1 text-[11px] font-medium', validationTone)}>
                  {validation ? (validation.valid ? '通过' : '未通过') : '未校验'}
                </div>
              </div>

              <div className="space-y-3 p-4">
                <div className="flex items-center gap-2 text-[13px] text-slate-600 dark:text-slate-400">
                  <ShieldCheck size={15} />
                  <span>{actionMessage}</span>
                </div>
                {validation ? (
                  <>
                    {validation.errors.length ? (
                      <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-[12px] text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                        <div className="mb-2 flex items-center gap-2 font-medium">
                          <AlertTriangle size={14} />
                          错误
                        </div>
                        <ul className="space-y-1 leading-5">
                          {validation.errors.map((error) => (
                            <li key={error}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {validation.warnings.length ? (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
                        <div className="mb-2 flex items-center gap-2 font-medium">
                          <Sparkles size={14} />
                          提示
                        </div>
                        <ul className="space-y-1 leading-5">
                          {validation.warnings.map((warning) => (
                            <li key={warning}>• {warning}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {validation.valid ? (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-[12px] text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100">
                        <div className="flex items-center gap-2 font-medium">
                          <CheckCircle2 size={14} />
                          当前代码可保存。
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-[12px] text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
                    点击「校验」后，这里会显示语法检查结果和策略约束提示。
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
              <div className="border-b border-slate-200 px-4 py-3 text-[13px] font-medium text-slate-700 dark:border-slate-800 dark:text-slate-200">操作</div>
              <div className="space-y-2 p-4">
                <button
                  onClick={onGoBacktest}
                  disabled={saveLoading || validateLoading || deleteLoading}
                  className="flex h-9 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-[12px] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                >
                  <Target size={14} />
                  去回测
                </button>

                <button
                  onClick={onDelete}
                  disabled={deleteLoading || saveLoading || validateLoading || selectedStrategyId === null}
                  className="flex h-9 w-full items-center justify-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-4 text-[12px] font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/15"
                >
                  {deleteLoading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  删除策略
                </button>
              </div>

              <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-[12px] leading-5 text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                <div className="font-medium text-slate-700 dark:text-slate-200">当前状态</div>
                <div className="mt-1">策略：{activeStrategyLabel || '未命名策略'}</div>
                <div>更新时间：{formatTime(selectedStrategy?.updated_at || null)}</div>
                <div>创建时间：{formatTime(selectedStrategy?.created_at || null)}</div>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )

  const rightPanel = (
    <StrategyCopilot
      currentStrategy={selectedStrategy}
      currentCode={editorState.code}
      onCodeChange={(code) => {
        setEditorState(prev => ({ ...prev, code }))
        setDirty(true)
      }}
      onSchemaChange={(schema) => {
        setEditorState(prev => ({ 
          ...prev, 
          parametersSchemaText: JSON.stringify(schema, null, 2) 
        }))
        setDirty(true)
      }}
    />
  )

  return (
    <WorkbenchLayout
      className="bg-[#f3f5f7] dark:bg-slate-950"
      innerClassName="border border-slate-200/90 bg-[#f7f8fa] dark:border-slate-800 dark:bg-slate-950"
      leftPanelId="strategy-left"
      mainPanelId="strategy-main"
      rightPanelId="strategy-right"
      leftMinPx={280}
      leftMaxPx={420}
      rightMinPx={280}
      rightMaxPx={420}
      left={leftPanel}
      main={mainPanel}
      right={rightPanel}
    />
  )
}
