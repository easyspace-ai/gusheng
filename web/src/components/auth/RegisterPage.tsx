import * as React from "react";
import { User, Mail, Lock, Eye, EyeOff, ShieldCheck, BarChart3, Verified, Shield } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils";
import { motion } from "motion/react";

interface RegisterPageProps {
  onLoginClick: () => void;
  onRegisterSuccess: () => void;
}

export function RegisterPage({ onLoginClick, onRegisterSuccess }: RegisterPageProps) {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <div className="min-h-screen w-full bg-[#f7f9fb] font-sans text-[#191c1e] flex flex-col relative overflow-hidden">
      {/* Background Abstract Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-3xl" />

      <main className="flex-grow flex items-center justify-center p-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[480px]"
        >
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 md:p-12">
            {/* Brand Anchor */}
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

            <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); onRegisterSuccess(); }}>
              {/* Username Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">用户名</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <input 
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-1 focus:ring-blue-500 transition-all outline-none" 
                    placeholder="设置您的唯一标识" 
                    type="text" 
                  />
                </div>
              </div>

              {/* Email/Phone Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">手机号 / 邮箱</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <input 
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-1 focus:ring-blue-500 transition-all outline-none" 
                    placeholder="用于账号验证与找回" 
                    type="text" 
                  />
                </div>
              </div>

              {/* Verification Code Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">验证码</label>
                <div className="flex gap-3">
                  <div className="relative group flex-grow">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input 
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-1 focus:ring-blue-500 transition-all outline-none" 
                      placeholder="输入验证码" 
                      type="text" 
                    />
                  </div>
                  <button className="px-5 py-3 bg-slate-100 text-slate-900 font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-colors whitespace-nowrap" type="button">
                    获取验证码
                  </button>
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">登录密码</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <input 
                    className="w-full pl-11 pr-12 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-1 focus:ring-blue-500 transition-all outline-none" 
                    placeholder="至少8位字符，含数字与字母" 
                    type={showPassword ? "text" : "password"} 
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

              {/* Terms Agreement */}
              <div className="flex items-start gap-3 py-2">
                <input className="w-4 h-4 rounded border-slate-300 text-black focus:ring-black mt-0.5" id="terms" type="checkbox" />
                <label className="text-[10px] font-bold text-slate-500 leading-tight cursor-pointer" htmlFor="terms">
                  我已阅读并同意 <a className="text-blue-600 hover:underline" href="#">服务条款</a> 和 <a className="text-blue-600 hover:underline" href="#">隐私政策</a>
                </label>
              </div>

              {/* Submit Action */}
              <div className="pt-4">
                <Button className="w-full py-8 bg-black text-white hover:bg-slate-800 font-black text-sm rounded-xl shadow-lg transition-all active:scale-[0.98] uppercase tracking-[0.2em]" type="submit">
                  完成注册
                </Button>
              </div>
            </form>

            {/* Secondary Option */}
            <div className="mt-8 text-center">
              <p className="text-sm font-medium text-slate-500">
                已有账号？ <button onClick={onLoginClick} className="text-black font-black hover:underline ml-1 uppercase tracking-wider">去登录</button>
              </p>
            </div>
          </div>

          {/* Trust Badges */}
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

      {/* Footer Component */}
      <footer className="w-full py-8 border-t border-slate-200/50 bg-white">
        <div className="flex flex-col md:flex-row justify-between items-center px-8 max-w-7xl mx-auto gap-4">
          <div className="text-lg font-black text-slate-300 tracking-tighter uppercase">Jiulimi</div>
          <div className="flex gap-6">
            <a className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors" href="#">隐私政策</a>
            <a className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors" href="#">服务条款</a>
            <a className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors" href="#">关于我们</a>
            <a className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors" href="#">联系支持</a>
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            © 2024 九立米投研平台 Jiulimi Investment Research. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
