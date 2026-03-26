export interface RuntimeConfig {
  llm_provider: string
  deep_think_llm: string
  quick_think_llm: string
  backend_url: string
  max_debate_rounds: number
  max_risk_discuss_rounds: number
  has_api_key?: boolean
  server_fallback_enabled?: boolean
}

export interface RuntimeConfigUpdate {
  llm_provider?: string
  deep_think_llm?: string
  quick_think_llm?: string
  backend_url?: string
  max_debate_rounds?: number
  max_risk_discuss_rounds?: number
  api_key?: string
  clear_api_key?: boolean
}

export interface RuntimeConfigUpdateResponse {
  message: string
  applied: RuntimeConfigUpdate
  has_api_key: boolean
  current: RuntimeConfig
}

function getBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim()
  if (envUrl) return envUrl.replace(/\/$/, '')
  return 'http://localhost:8787'
}

async function readErrorMessage(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    try {
      const data = await response.json()
      return data?.detail || data?.message || response.statusText
    } catch {
      return response.statusText
    }
  }
  try {
    const text = await response.text()
    return text || response.statusText
  } catch {
    return response.statusText
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  return response.json() as Promise<T>
}

export function getRuntimeConfig(): Promise<RuntimeConfig> {
  return request<RuntimeConfig>('/v1/config')
}

export function updateRuntimeConfig(updates: RuntimeConfigUpdate): Promise<RuntimeConfigUpdateResponse> {
  return request<RuntimeConfigUpdateResponse>('/v1/config', {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
}
