import * as React from "react";
import { User, Mail, Lock, Eye, EyeOff, ShieldCheck, BarChart3, Shield, Zap, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { sendVerificationCode } from "@/lib/authApi";
import { cn } from "@/lib/utils";

interface RegisterPageProps {
  onLoginClick: () => void;
  onRegisterSuccess: () => void;
}

export function RegisterPage({ onLoginClick, onRegisterSuccess }: RegisterPageProps) {
  const { register } = useAuth();
  const [showPassword, setShowPassword] = React.useState(false);
  const [username, setUsername] = React.useState("");
  const [contact, setContact] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [agree, setAgree] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [codeBusy, setCodeBusy] = React.useState(false);

  async function handleSendCode() {
    setError(null);
    if (!contact.trim()) {
      setError("请先填写手机号或邮箱");
      return;
    }
    setCodeBusy(true);
    try {
      await sendVerificationCode(contact.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "发送失败");
    } finally {
      setCodeBusy(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!agree) {
      setError("请阅读并同意服务条款与隐私政策");
      return;
    }
    if (!username.trim() || !contact.trim() || !password) {
      setError("请填写用户名、联系方式和密码");
      return;
    }
    setPending(true);
    try {
      await register(username.trim(), contact.trim(), password);
      onRegisterSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "注册失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 dark:bg-gray-950 font-sans text-gray-900 dark:text-gray-100 flex relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/8 rounded-full blur-[100px]" />
        <div className="absolute inset-0 saas-bg-grid opacity-50" />
      </div>

      {/* 左侧注册表单 */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-lg"
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
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">创建账号</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                加入我们，开启专业的量化投研之旅
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

            <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  用户名
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User size={18} className="text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors" />
                  </div>
                  <input
                    className={cn(
                      "w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-10 py-3 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 transition-all outline-none text-sm",
                      pending && "opacity-50 cursor-not-allowed"
                    )}
                    placeholder="设置您的用户名"
                    type="text"
                    name="username"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={pending}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  手机号 / 邮箱
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail size={18} className="text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors" />
                  </div>
                  <input
                    className={cn(
                      "w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-10 py-3 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 transition-all outline-none text-sm",
                      pending && "opacity-50 cursor-not-allowed"
                    )}
                    placeholder="用于账号验证与找回"
                    type="text"
                    name="contact"
                    autoComplete="email"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    disabled={pending}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  验证码
                </label>
                <div className="flex gap-3">
                  <div className="relative group flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <ShieldCheck size={18} className="text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors" />
                    </div>
                    <input
                      className={cn(
                        "w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-10 py-3 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 transition-all outline-none text-sm",
                        pending && "opacity-50 cursor-not-allowed"
                      )}
                      placeholder="输入验证码"
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      disabled={pending}
                    />
                  </div>
                  <button
                    className={cn(
                      "px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 font-semibold text-xs rounded-xl transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed",
                      codeBusy && "cursor-wait"
                    )}
                    type="button"
                    onClick={() => void handleSendCode()}
                    disabled={pending || codeBusy}
                  >
                    {codeBusy ? "发送中…" : "获取验证码"}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  登录密码
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock size={18} className="text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors" />
                  </div>
                  <input
                    className={cn(
                      "w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-10 pr-11 py-3 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 transition-all outline-none text-sm",
                      pending && "opacity-50 cursor-not-allowed"
                    )}
                    placeholder="设置登录密码"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="new-password"
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

              <div className="flex items-start gap-3 py-2">
                <input
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500/20 bg-gray-50 dark:bg-gray-800 mt-0.5"
                  id="terms"
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  disabled={pending}
                />
                <label className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer" htmlFor="terms">
                  我已阅读并同意 <span className="text-blue-600 dark:text-blue-400">服务条款</span> 和 <span className="text-blue-600 dark:text-blue-400">隐私政策</span>
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
                    注册中…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Zap size={16} />
                    完成注册
                  </span>
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
              已有账号？{" "}
              <button
                type="button"
                onClick={onLoginClick}
                className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                立即登录
              </button>
            </p>
          </div>

          <div className="mt-8 flex justify-center items-center gap-8 text-gray-400 dark:text-gray-500">
            <div className="flex items-center gap-2">
              <Shield size={16} />
              <span className="text-xs font-semibold uppercase tracking-wider">数据加密</span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 size={16} />
              <span className="text-xs font-semibold uppercase tracking-wider">专业工具</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* 右侧品牌区域 */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 to-teal-700">
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
              <span className="text-emerald-200 text-sm">专业量化投研平台</span>
            </div>
          </div>

          {/* 中间内容 */}
          <div className="my-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h1 className="text-4xl font-bold text-white leading-tight mb-4">
                专业投研，
                <br />
                <span className="text-emerald-200">从此刻开始</span>
              </h1>
              <p className="text-emerald-100 text-lg max-w-md">
                加入数万名专业投资者，使用强大的量化工具提升您的投资效率。
              </p>
            </motion.div>

            <div className="mt-10 space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-white/10 border border-white/10 backdrop-blur-sm">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-md">
                  <Zap size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">快速上手</h3>
                  <p className="text-xs text-emerald-200 mt-0.5">30秒完成注册，立即开始使用</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-white/10 border border-white/10 backdrop-blur-sm">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-md">
                  <Shield size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">安全可靠</h3>
                  <p className="text-xs text-emerald-200 mt-0.5">企业级数据加密，保护您的隐私</p>
                </div>
              </div>
            </div>
          </div>

          {/* 底部 */}
          <div className="flex items-center gap-8 text-white/60">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-sm">服务正常运行</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
