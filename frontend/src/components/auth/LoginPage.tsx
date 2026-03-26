import * as React from "react";
import { Mail, Eye, EyeOff, MessageSquare, ShieldCheck, TrendingUp, Zap, BarChart3, Layers, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface LoginPageProps {
  onRegisterClick: () => void;
  onLoginSuccess: () => void;
}

// 特性卡片
function FeatureCard({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20">
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{title}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
      </div>
    </div>
  );
}

export function LoginPage({ onRegisterClick, onLoginSuccess }: LoginPageProps) {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = React.useState(false);
  const [loginId, setLoginId] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [remember, setRemember] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!loginId.trim() || !password) {
      setError("请填写账号和密码");
      return;
    }
    setPending(true);
    try {
      await login(loginId.trim(), password);
      if (!remember) {
        /* token stays in localStorage; "remember me" could use sessionStorage — omitted for simplicity */
      }
      onLoginSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 dark:bg-gray-950 font-sans text-gray-900 dark:text-gray-100 flex relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-amber-500/8 rounded-full blur-[100px]" />
        <div className="absolute inset-0 saas-bg-grid opacity-50" />
      </div>

      {/* 左侧品牌区域 */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-700">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 saas-bg-grid" style={{ backgroundSize: "32px 32px" }} />
          </div>
        </div>

        <div className="relative z-10 flex flex-col justify-between w-full p-12">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <TrendingUp size={24} className="text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-white tracking-tight">Quantum Pro</span>
              <span className="text-blue-200 text-sm">专业量化投研平台</span>
            </div>
          </div>

          {/* 中间特性展示 */}
          <div className="my-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h1 className="text-4xl font-bold text-white leading-tight mb-4">
                专业的量化交易
                <br />
                <span className="text-blue-200">解决方案</span>
              </h1>
              <p className="text-blue-100 text-lg max-w-md">
                强大的AI分析、智能选股、策略回测，助您在市场中把握每一个机会。
              </p>
            </motion.div>

            <div className="mt-10 space-y-4">
              <FeatureCard
                icon={Sparkles}
                title="AI 智能分析"
                description="深度分析市场数据，提供智能洞察"
              />
              <FeatureCard
                icon={BarChart3}
                title="策略回测引擎"
                description="高速回测系统，验证策略有效性"
              />
              <FeatureCard
                icon={Layers}
                title="多维度选股"
                description="丰富的筛选条件，精准捕捉机会"
              />
            </div>
          </div>

          {/* 底部信任标识 */}
          <div className="flex items-center gap-8 text-blue-200/70">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-sm">系统运行正常</span>
            </div>
            <div className="text-sm">企业级安全保障</div>
            <div className="text-sm">7×24 小时服务</div>
          </div>
        </div>
      </div>

      {/* 右侧登录表单 */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* 移动端 Logo */}
          <div className="lg:hidden flex items-center justify-center mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <TrendingUp size={20} className="text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Quantum Pro</span>
                <span className="text-gray-500 dark:text-gray-400 text-xs">专业量化投研平台</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-black/20 border border-gray-200 dark:border-gray-800">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">欢迎回来</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                登录您的账户，继续您的量化之旅
              </p>
            </div>

            {error ? (
              <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center mt-0.5">
                  <span className="text-red-600 dark:text-red-400 text-xs font-bold">!</span>
                </div>
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            ) : null}

            <form className="space-y-5" onSubmit={(e) => void handleSubmit(e)}>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  邮箱或手机号码
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail size={18} className="text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors" />
                  </div>
                  <input
                    className={cn(
                      "w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-10 py-3 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 transition-all outline-none",
                      pending && "opacity-50 cursor-not-allowed"
                    )}
                    placeholder="name@company.com"
                    type="text"
                    name="login"
                    autoComplete="username"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    disabled={pending}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    密码
                  </label>
                  <button type="button" className="text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                    忘记密码？
                  </button>
                </div>
                <div className="relative group">
                  <input
                    className={cn(
                      "w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 pr-11 py-3 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 transition-all outline-none",
                      pending && "opacity-50 cursor-not-allowed"
                    )}
                    placeholder="••••••••"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={pending}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    disabled={pending}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="peer w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500/20 bg-gray-50 dark:bg-gray-800"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      disabled={pending}
                    />
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors">
                    记住登录状态
                  </span>
                </label>
              </div>

              <Button
                type="submit"
                disabled={pending}
                className={cn(
                  "w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 mt-2",
                  pending && "opacity-70 cursor-not-allowed"
                )}
              >
                {pending ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    登录中…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Zap size={16} />
                    立即登录
                  </span>
                )}
              </Button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full h-px bg-gray-200 dark:bg-gray-800"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white dark:bg-gray-900 px-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                  或者
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-all text-gray-500 dark:text-gray-400 cursor-not-allowed"
                disabled
              >
                <MessageSquare size={16} className="text-green-500" />
                <span className="text-sm font-medium">微信登录</span>
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-all text-gray-500 dark:text-gray-400 cursor-not-allowed"
                disabled
              >
                <ShieldCheck size={16} className="text-blue-500" />
                <span className="text-sm font-medium">SSO 登录</span>
              </button>
            </div>

            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
              还没有账号？{" "}
              <button
                type="button"
                onClick={onRegisterClick}
                className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                免费注册
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
