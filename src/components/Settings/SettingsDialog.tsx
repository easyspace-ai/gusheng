import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Database, Key, Link2, Loader2, Save, Sparkles, Trash2, User } from 'lucide-react'
import type { CurrentUser } from '@/lib/authApi'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  getCustomAnalysisPrompt,
  getDefaultAnalysisAnalysts,
  setCustomAnalysisPrompt,
  setDefaultAnalysisAnalysts,
} from '@/lib/analysisPreferences'
import { getRuntimeConfig, updateRuntimeConfig, type RuntimeConfig } from '@/lib/configApi'

type ProviderPresetId = 'openai' | 'volcengine' | 'anthropic' | 'google' | 'openrouter' | 'ollama' | 'custom'

const PROVIDER_PRESETS: Array<{
  id: ProviderPresetId
  label: string
  protocol: string
  baseUrl: string
  editableBaseUrl: boolean
}> = [
  {
    id: 'volcengine',
    label: '火山方舟',
    protocol: 'OpenAI Compatible',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/coding/v3',
    editableBaseUrl: false,
  },
  {
    id: 'openai',
    label: 'OpenAI',
    protocol: 'OpenAI Compatible',
    baseUrl: 'https://api.openai.com/v1',
    editableBaseUrl: false,
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    protocol: 'OpenAI Compatible',
    baseUrl: 'https://openrouter.ai/api/v1',
    editableBaseUrl: false,
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    protocol: 'Anthropic API',
    baseUrl: 'https://api.anthropic.com',
    editableBaseUrl: false,
  },
  {
    id: 'google',
    label: 'Google',
    protocol: 'Google API',
    baseUrl: 'https://generativelanguage.googleapis.com',
    editableBaseUrl: false,
  },
  {
    id: 'ollama',
    label: 'Ollama',
    protocol: 'OpenAI Compatible',
    baseUrl: 'http://localhost:11434/v1',
    editableBaseUrl: false,
  },
  {
    id: 'custom',
    label: '自定义',
    protocol: 'OpenAI Compatible',
    baseUrl: '',
    editableBaseUrl: true,
  },
]

const ANALYST_ITEMS = [
  { key: 'market', label: '市场分析' },
  { key: 'social', label: '舆情分析' },
  { key: 'news', label: '新闻分析' },
  { key: 'fundamentals', label: '基本面' },
  { key: 'macro', label: '宏观板块' },
  { key: 'smart_money', label: '主力资金' },
]

function inferPreset(config: RuntimeConfig | null): ProviderPresetId {
  const provider = String(config?.llm_provider || '').toLowerCase()
  const baseUrl = String(config?.backend_url || '').toLowerCase()

  if (provider === 'anthropic' || baseUrl.includes('anthropic')) return 'anthropic'
  if (provider === 'google' || baseUrl.includes('googleapis')) return 'google'
  if (provider === 'ollama' || baseUrl.includes('11434')) return 'ollama'
  if (baseUrl.includes('openrouter')) return 'openrouter'
  if (baseUrl.includes('ark.cn-beijing.volces.com') || baseUrl.includes('volces')) return 'volcengine'
  if (provider === 'openai' || baseUrl.includes('api.openai.com')) return 'openai'
  return config?.backend_url ? 'custom' : 'volcengine'
}

function normalizeProvider(provider: ProviderPresetId): string {
  if (provider === 'volcengine') return 'openai'
  return provider
}

function getDefaultModel(provider: ProviderPresetId, kind: 'quick' | 'deep'): string {
  if (provider === 'openai') return kind === 'quick' ? 'gpt-4o-mini' : 'gpt-4o'
  if (provider === 'openrouter') return kind === 'quick' ? 'openai/gpt-4o-mini' : 'openai/gpt-4o'
  if (provider === 'anthropic') return kind === 'quick' ? 'claude-3-5-sonnet-latest' : 'claude-3-7-sonnet-latest'
  if (provider === 'google') return kind === 'quick' ? 'gemini-2.0-flash' : 'gemini-2.5-pro'
  if (provider === 'ollama') return kind === 'quick' ? 'qwen2.5:7b' : 'qwen2.5:14b'
  if (provider === 'custom') return ''
  return kind === 'quick' ? 'doubao-seed-2-0-pro-260215' : 'doubao-seed-2-0-pro-260215'
}

export function SettingsDialog({
  open,
  onOpenChange,
  currentUser,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentUser: CurrentUser | null
}) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [providerPreset, setProviderPreset] = useState<ProviderPresetId>('volcengine')
  const [customBaseUrl, setCustomBaseUrl] = useState('')
  const [deepThinkLlm, setDeepThinkLlm] = useState('')
  const [quickThinkLlm, setQuickThinkLlm] = useState('')
  const [llmApiKey, setLlmApiKey] = useState('')
  const [hasStoredApiKey, setHasStoredApiKey] = useState(false)
  const [serverFallbackEnabled, setServerFallbackEnabled] = useState(true)
  const [maxDebateRounds, setMaxDebateRounds] = useState(2)
  const [maxRiskRounds, setMaxRiskRounds] = useState(1)
  const [defaultAnalysts, setDefaultAnalystsState] = useState<string[]>(() => getDefaultAnalysisAnalysts())
  const [customPrompt, setCustomPromptState] = useState(() => getCustomAnalysisPrompt())

  const selectedPreset = useMemo(
    () => PROVIDER_PRESETS.find((item) => item.id === providerPreset) || PROVIDER_PRESETS[0],
    [providerPreset],
  )

  useEffect(() => {
    if (!open) return
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const runtimeConfig = await getRuntimeConfig()
        if (cancelled) return
        setProviderPreset(inferPreset(runtimeConfig))
        setCustomBaseUrl(runtimeConfig.backend_url || '')
        setDeepThinkLlm(runtimeConfig.deep_think_llm || '')
        setQuickThinkLlm(runtimeConfig.quick_think_llm || '')
        setHasStoredApiKey(!!runtimeConfig.has_api_key)
        setServerFallbackEnabled(runtimeConfig.server_fallback_enabled ?? true)
        setMaxDebateRounds(runtimeConfig.max_debate_rounds || 2)
        setMaxRiskRounds(runtimeConfig.max_risk_discuss_rounds || 1)
        setDefaultAnalystsState(getDefaultAnalysisAnalysts())
        setCustomPromptState(getCustomAnalysisPrompt())
      } catch (loadError) {
        if (cancelled) return
        setError(loadError instanceof Error ? loadError.message : '加载配置失败')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    if (providerPreset === 'custom') return
    if (!customBaseUrl && selectedPreset.baseUrl) {
      setCustomBaseUrl(selectedPreset.baseUrl)
    }
  }, [open, providerPreset, selectedPreset.baseUrl, customBaseUrl])

  const onChangePreset = (nextPreset: ProviderPresetId) => {
    setProviderPreset(nextPreset)
    if (nextPreset !== 'custom') {
      setCustomBaseUrl(PROVIDER_PRESETS.find((item) => item.id === nextPreset)?.baseUrl || '')
      if (!quickThinkLlm) setQuickThinkLlm(getDefaultModel(nextPreset, 'quick'))
      if (!deepThinkLlm) setDeepThinkLlm(getDefaultModel(nextPreset, 'deep'))
    }
  }

  const toggleAnalyst = (key: string) => {
    setDefaultAnalystsState((prev) => {
      const next = prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
      return next.length ? next : prev
    })
  }

  const handleClearApiKey = async () => {
    setSaving(true)
    setError(null)
    try {
      const response = await updateRuntimeConfig({ clear_api_key: true })
      setHasStoredApiKey(!!response.has_api_key)
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : '清除密钥失败')
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const response = await updateRuntimeConfig({
        llm_provider: normalizeProvider(providerPreset),
        backend_url: customBaseUrl || undefined,
        deep_think_llm: deepThinkLlm.trim() || undefined,
        quick_think_llm: quickThinkLlm.trim() || undefined,
        api_key: llmApiKey.trim() || undefined,
        max_debate_rounds: maxDebateRounds,
        max_risk_discuss_rounds: maxRiskRounds,
      })
      setHasStoredApiKey(!!response.has_api_key)
      setCustomAnalysisPrompt(customPrompt)
      setDefaultAnalysisAnalysts(defaultAnalysts)
      setLlmApiKey('')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '保存配置失败')
    } finally {
      setSaving(false)
    }
  }

  const fallbackNote = serverFallbackEnabled
    ? '当前后端已开启公共模型回退：未填写个人 Key 时，可能仍会使用服务端默认模型配置。'
    : '当前后端已关闭公共模型回退：未填写个人 Key 时，将无法发起需要模型的分析任务。'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(1080px,calc(100vw-1.5rem))] max-w-none h-[min(92vh,920px)] max-h-[calc(100vh-1.5rem)] p-0 overflow-hidden rounded-[28px] border border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/95 shadow-[0_30px_120px_rgba(15,23,42,0.25)]">
        <div className="flex h-full min-h-0 flex-col bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.08),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.08),_transparent_28%),linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.12),_transparent_28%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)]">
          <div className="border-b border-slate-200/70 dark:border-slate-800/80 px-6 py-5">
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50 flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 via-cyan-500 to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Sparkles className="w-6 h-6" />
                </div>
                系统设置
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400">
                配置当前账户的分析参数与私有模型
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
            <div className="space-y-5 pb-2">
              <section className="rounded-[24px] border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/50 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-cyan-500" />
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">账户空间</h2>
                </div>
                <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                  <div>当前登录：{currentUser?.email || '-'}</div>
                  <div className="mt-1 text-slate-500 dark:text-slate-400">报告历史、分析任务和模型配置仅当前账户可见。</div>
                </div>
              </section>

              <section className="rounded-[24px] border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/50 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-purple-500" />
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">模型接入</h2>
                  {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400 ml-auto" />}
                </div>

                {error && (
                  <div className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                    <AlertCircle className="mt-0.5 w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-400">模型厂商</label>
                    <select
                      value={providerPreset}
                      onChange={(e) => onChangePreset(e.target.value as ProviderPresetId)}
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                      disabled={loading}
                    >
                      {PROVIDER_PRESETS.map((preset) => (
                        <option key={preset.id} value={preset.id}>
                          {preset.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-400">接入协议</label>
                    <div className="flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
                      <Link2 className="w-4 h-4 text-slate-400" />
                      <span>{selectedPreset.protocol}</span>
                    </div>
                  </div>

                  {(selectedPreset.baseUrl || selectedPreset.editableBaseUrl) && (
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-400">Base URL</label>
                      <input
                        type="text"
                        value={selectedPreset.editableBaseUrl ? customBaseUrl : selectedPreset.baseUrl}
                        onChange={(e) => setCustomBaseUrl(e.target.value)}
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:disabled:bg-slate-900/50"
                        disabled={loading || !selectedPreset.editableBaseUrl}
                        placeholder="https://your-openai-compatible-endpoint/v1"
                      />
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {selectedPreset.editableBaseUrl
                          ? '自定义 OpenAI 兼容服务需要自行填写 Base URL。'
                          : '该厂商默认通过预设的 OpenAI 兼容地址接入，通常只需填写模型名和 API Key。'}
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-400">深度思考模型</label>
                    <input
                      type="text"
                      value={deepThinkLlm}
                      onChange={(e) => setDeepThinkLlm(e.target.value)}
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                      placeholder="例如：gpt-4.1 / deepseek-reasoner / kimi-k2-0905-preview"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-400">快速推理模型</label>
                    <input
                      type="text"
                      value={quickThinkLlm}
                      onChange={(e) => setQuickThinkLlm(e.target.value)}
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                      placeholder="例如：gpt-4.1-mini / deepseek-chat / moonshot-v1-8k"
                      disabled={loading}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-400">用户模型 Key</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="password"
                        value={llmApiKey}
                        onChange={(e) => setLlmApiKey(e.target.value)}
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                        placeholder={hasStoredApiKey ? '已保存，留空则保持不变' : '输入你的模型 API Key'}
                        disabled={loading}
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs text-slate-500 dark:text-slate-400">{fallbackNote}</div>
                      {hasStoredApiKey && (
                        <button
                          type="button"
                          onClick={handleClearApiKey}
                          disabled={saving}
                          className="inline-flex items-center gap-1 text-xs text-rose-500 hover:text-rose-600 disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          清除密钥
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-400">辩论轮数上限</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={maxDebateRounds}
                      onChange={(e) => setMaxDebateRounds(Number(e.target.value))}
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-400">风险讨论轮数上限</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={maxRiskRounds}
                      onChange={(e) => setMaxRiskRounds(Number(e.target.value))}
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                      disabled={loading}
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-[24px] border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/50 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-500" />
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">默认分析配置</h2>
                </div>

                <div className="mt-4">
                  <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-400">默认启用分析师</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {ANALYST_ITEMS.map((analyst) => {
                      const active = defaultAnalysts.includes(analyst.key)
                      return (
                        <button
                          key={analyst.key}
                          type="button"
                          onClick={() => toggleAnalyst(analyst.key)}
                          className={`rounded-2xl border px-3 py-3 text-left text-sm transition-colors ${
                            active
                              ? 'border-blue-500 bg-blue-50 text-blue-600 dark:border-blue-500/60 dark:bg-blue-500/10 dark:text-blue-300'
                              : 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400'
                          }`}
                        >
                          {analyst.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="mt-5">
                  <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-400">自定义分析提示</label>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPromptState(e.target.value)}
                    className="min-h-[120px] w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    placeholder="例如：更关注估值安全边际、政策催化与机构资金行为。"
                  />
                </div>
              </section>
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t border-slate-200/70 dark:border-slate-800/80 px-6 py-4 bg-white/70 dark:bg-slate-950/70">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                保存后分析页会优先使用当前账户配置，默认分析师与提示词保存在本地浏览器。
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="h-10 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || loading}
                  className="inline-flex h-10 items-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  保存设置
                </button>
              </div>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
