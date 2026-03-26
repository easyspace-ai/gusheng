import * as React from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { ActivityBar } from "./components/layout/ActivityBar";
import { TopNav } from "./components/layout/TopNav";
import { WorkbenchChromeProvider } from "./components/layout/WorkbenchChromeContext";
import { LoginPage } from "./components/auth/LoginPage";
import { RegisterPage } from "./components/auth/RegisterPage";
import { PlaceholderWorkbench } from "./components/workbench/PlaceholderWorkbench";
import { MarketRouteLayout } from "./features/market/MarketRouteLayout";
import { AnalysisRouteLayout } from "./features/analysis/AnalysisRouteLayout";
import { BacktestRouteLayout } from "./features/backtest/BacktestRouteLayout";
import { PickerRouteLayout } from "./features/picker/PickerRouteLayout";
import { EndOfDayPicker } from "./components/picker/pages/EndOfDayPicker/EndOfDayPicker";
import { MomentumScanner } from "./components/picker/pages/MomentumScanner/MomentumScanner";
import { KunpengScanner } from "./components/picker/pages/KunpengScanner/KunpengScanner";
import { useAuth } from "./contexts/AuthContext";

function LoginRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    typeof (location.state as { from?: string } | null)?.from === "string"
      ? (location.state as { from: string }).from
      : "/analysis";

  return (
    <LoginPage
      onRegisterClick={() => navigate("/register")}
      onLoginSuccess={() => navigate(from, { replace: true })}
    />
  );
}

function RegisterRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    typeof (location.state as { from?: string } | null)?.from === "string"
      ? (location.state as { from: string }).from
      : "/analysis";

  return (
    <RegisterPage
      onLoginClick={() => navigate("/login", { state: location.state })}
      onRegisterSuccess={() => navigate(from, { replace: true })}
    />
  );
}

/** 已登录用户不得访问登录/注册页 */
function GuestOnly({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f7f9fb] text-slate-500 text-sm">
        加载中…
      </div>
    );
  }
  if (user) {
    return <Navigate to="/analysis" replace />;
  }
  return <>{children}</>;
}

/** 未登录不得进入工作台 */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500 text-sm">
        加载中…
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

function AppShell() {
  const [leftCollapsed, setLeftCollapsed] = React.useState(false);
  const [rightCollapsed, setRightCollapsed] = React.useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = React.useCallback(async () => {
    await logout();
    navigate("/login", { replace: true });
  }, [logout, navigate]);

  const chrome = React.useMemo(
    () => ({
      leftCollapsed,
      rightCollapsed,
      toggleLeft: () => setLeftCollapsed((c) => !c),
      toggleRight: () => setRightCollapsed((c) => !c),
    }),
    [leftCollapsed, rightCollapsed],
  );

  return (
    <WorkbenchChromeProvider value={chrome}>
      <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans selection:bg-slate-200 dark:selection:bg-slate-800">
        <ActivityBar onLogout={handleLogout} />

        <div className="flex-1 flex flex-col ml-20 overflow-hidden min-w-0">
          <TopNav />

          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <Routes>
              <Route path="/" element={<Navigate to="/analysis" replace />} />
              <Route path="/analysis/*" element={<AnalysisRouteLayout />} />
              <Route path="/market/*" element={<MarketRouteLayout />} />
              <Route path="/picker" element={<PickerRouteLayout />}>
                <Route index element={<Navigate to="eod" replace />} />
                <Route path="eod" element={<EndOfDayPicker />} />
                <Route path="momentum" element={<MomentumScanner />} />
                <Route path="kunpeng" element={<KunpengScanner />} />
              </Route>
              <Route path="/backtest/*" element={<BacktestRouteLayout />} />
              <Route path="/strategies/*" element={<PlaceholderWorkbench tab="strategy" />} />
              <Route path="*" element={<Navigate to="/analysis" replace />} />
            </Routes>
          </div>
        </div>
      </div>
    </WorkbenchChromeProvider>
  );
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestOnly>
            <LoginRoute />
          </GuestOnly>
        }
      />
      <Route
        path="/register"
        element={
          <GuestOnly>
            <RegisterRoute />
          </GuestOnly>
        }
      />
      <Route
        path="*"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      />
    </Routes>
  );
}
