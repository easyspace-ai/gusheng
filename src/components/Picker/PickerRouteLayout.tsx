import type { ComponentType, ReactNode } from 'react'
import { Target, TrendingUp, Flame, Fish } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ToastProvider } from '@/components/Picker/common/Toast'
import { EndOfDayPicker } from '@/components/Picker/pages/EndOfDayPicker/EndOfDayPicker'
import { MomentumScanner } from '@/components/Picker/pages/MomentumScanner/MomentumScanner'
import { KunpengScanner } from '@/components/Picker/pages/KunpengScanner/KunpengScanner'

type PickerRoute = {
  path: string
  label: string
  description: string
  icon: ComponentType<{ className?: string }>
  element: ReactNode
}

const PICKER_ROUTES: PickerRoute[] = [
  {
    path: '/picker/eod',
    label: '尾盘选股',
    description: '一日持股法，盘尾筛出强势候选',
    icon: TrendingUp,
    element: <EndOfDayPicker />,
  },
  {
    path: '/picker/momentum',
    label: '妖股扫描',
    description: '动量、趋势、活跃度三因子扫描',
    icon: Flame,
    element: <MomentumScanner />,
  },
  {
    path: '/picker/kunpeng',
    label: '鲲鹏战法',
    description: '按安全垫与潜在倍数初筛标的',
    icon: Fish,
    element: <KunpengScanner />,
  },
]

function resolveActivePath(pathname: string) {
  if (pathname === '/picker' || pathname === '/picker/') return '/picker/eod'
  const matched = PICKER_ROUTES.find((item) => pathname.startsWith(item.path))
  return matched?.path ?? '/picker/eod'
}

export function PickerRouteLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const activePath = resolveActivePath(location.pathname)
  const activeRoute = PICKER_ROUTES.find((item) => item.path === activePath) ?? PICKER_ROUTES[0]

  return (
    <ToastProvider>
      <div className="picker-theme flex min-h-0 flex-1 bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <aside className="flex w-[280px] shrink-0 flex-col border-r border-[var(--border-primary)] bg-[var(--bg-secondary)]">
          <div className="border-b border-[var(--border-primary)] px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-accent-bg)] text-[var(--color-accent)]">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold">选股</div>
                <div className="text-xs text-[var(--text-secondary)]">三个策略统一接入当前工作区</div>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-2 px-3 py-4">
            {PICKER_ROUTES.map((item) => {
              const Icon = item.icon
              const isActive = item.path === activePath
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${
                    isActive
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-bg)] shadow-[0_10px_30px_rgba(88,166,255,0.15)]'
                      : 'border-transparent bg-transparent hover:border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)]'
                  }`}
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-elevated)] text-[var(--color-accent)]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{item.label}</span>
                    <span className="mt-1 block text-xs leading-5 text-[var(--text-secondary)]">{item.description}</span>
                  </span>
                </button>
              )
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 overflow-auto">
          <div className="mx-auto h-full max-w-[1800px] px-6 py-6">{activeRoute.element}</div>
        </main>
      </div>
    </ToastProvider>
  )
}
