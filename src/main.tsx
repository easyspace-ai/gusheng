import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Apply persisted theme before React mounts to avoid FOUC
(() => {
  try {
    const theme = localStorage.getItem('app-theme') as 'obsidian' | 'nord' | 'solarized' | null
    const isDark = localStorage.getItem('app-dark') === '1'
    if (theme) {
      document.documentElement.setAttribute('data-theme', theme)
    }
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  } catch {}
})()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)