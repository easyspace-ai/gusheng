import * as React from "react";
import { User, Mail, Lock, Eye, EyeOff, ShieldCheck, BarChart3, Verified, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import { useAuth } from "@/contexts/AuthContext";
import { sendVerificationCode } from "@/lib/authApi";

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
    <div className="min-h-screen w-full bg-[#f7f9fb] font-sans text-[#191c1e] flex flex-col relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-3xl" />

      <main className="flex-grow flex items-center justify-center p-6 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[480px]">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 md:p-12">
            <div className="flex flex-col items-center mb-10 text-center">
              <div className="mb-6 flex items-center gap-2">
                <div className="w-10 h-10 bg-black flex items-center justify-center rounded-xl shadow-lg">
                  <BarChart3 className="text-white text-2xl" />
                </div>
                <span className="text-2xl font-black tracking-tighter text-black uppercase">九立米投研平台</span>
              </div>
              <h1 className="text-2xl font-black text-black tracking-tight mb-2 uppercase">开启您的投研之旅</h1>
              <p className="text-slate-500 text-sm font-medium">加入专业投资者社区，获取深度行业洞察</p>
            </div>

            {error ? (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-4">{error}</p>
            ) : null}

            <form className="space-y-5" onSubmit={(e) => void handleSubmit(e)}>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">用户名</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <input
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                    placeholder="设置您的唯一标识（字母数字下划线，3–32 位）"
                    type="text"
                    name="username"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={pending}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">手机号 / 邮箱</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <input
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-1 focus:ring-blue-500 transition-all outline-none"
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

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">验证码（可选，服务端暂未校验）</label>
                <div className="flex gap-3">
                  <div className="relative group flex-grow">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                      placeholder="输入验证码"
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      disabled={pending}
                    />
                  </div>
                  <button
                    className="px-5 py-3 bg-slate-100 text-slate-900 font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-colors whitespace-nowrap disabled:opacity-50"
                    type="button"
                    onClick={() => void handleSendCode()}
                    disabled={pending || codeBusy}
                  >
                    {codeBusy ? "…" : "获取验证码"}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">登录密码</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <input
                    className="w-full pl-11 pr-12 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                    placeholder="至少8位字符，含数字与字母"
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
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-3 py-2">
                <input
                  className="w-4 h-4 rounded border-slate-300 text-black focus:ring-black mt-0.5"
                  id="terms"
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  disabled={pending}
                />
                <label className="text-[10px] font-bold text-slate-500 leading-tight cursor-pointer" htmlFor="terms">
                  我已阅读并同意服务条款和隐私政策
                </label>
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={pending}
                  className="w-full py-8 bg-black text-white hover:bg-slate-800 font-black text-sm rounded-xl shadow-lg transition-all active:scale-[0.98] uppercase tracking-[0.2em]"
                >
                  {pending ? "提交中…" : "完成注册"}
                </Button>
              </div>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm font-medium text-slate-500">
                已有账号？{" "}
                <button type="button" onClick={onLoginClick} className="text-black font-black hover:underline ml-1 uppercase tracking-wider">
                  去登录
                </button>
              </p>
            </div>
          </div>

          <div className="mt-8 flex justify-center items-center gap-8 opacity-40">
            <div className="flex items-center gap-1.5 grayscale">
              <Verified size={16} />
              <span className="text-[9px] font-black tracking-[0.2em] uppercase">SSL SECURE</span>
            </div>
            <div className="flex items-center gap-1.5 grayscale">
              <Shield size={16} />
              <span className="text-[9px] font-black tracking-[0.2em] uppercase">DATA PRIVACY</span>
            </div>
          </div>
        </motion.div>
      </main>

      <footer className="w-full py-8 border-t border-slate-200/50 bg-white">
        <div className="flex flex-col md:flex-row justify-between items-center px-8 max-w-7xl mx-auto gap-4">
          <div className="text-lg font-black text-slate-300 tracking-tighter uppercase">Jiulimi</div>
          <div className="flex gap-6">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">隐私政策</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">服务条款</span>
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            © 2024 九立米投研平台 Jiulimi Investment Research. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
