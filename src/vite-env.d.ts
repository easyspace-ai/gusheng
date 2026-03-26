/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_TRADING_API_URL?: string
  readonly VITE_TRADING_API_TOKEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
