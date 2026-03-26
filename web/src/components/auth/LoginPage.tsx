import * as React from "react";
import { Mail, Lock, Eye, EyeOff, MessageSquare, ShieldCheck, BarChart3 } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils";
import { motion } from "motion/react";

interface LoginPageProps {
  onRegisterClick: () => void;
  onLoginSuccess: () => void;
}

export function LoginPage({ onRegisterClick, onLoginSuccess }: LoginPageProps) {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <div className="min-h-screen w-full bg-[#f7f9fb] font-sans text-[#191c1e] flex flex-col relative overflow-hidden">
      {/* Abstract Decoration */}
      <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[30%] bg-emerald-500/5 rounded-full blur-[100px]" />

      <main className="flex-grow flex items-center justify-center p-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[440px]"
        >
          <div className="bg-white p-10 rounded-3xl shadow-[0_32px_64px_-12px_rgba(25,28,30,0.04)] flex flex-col gap-8 border border-slate-100">
            {/* Brand Anchor */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-black flex items-center justify-center rounded-xl shadow-lg">
                <BarChart3 className="text-white text-2xl" />
              </div>
              <h1 className="font-headline font-extrabold text-2xl tracking-tighter text-[#191c1e]">九立米投研平台</h1>
            </div>

            {/* Heading */}
            <div className="space-y-1 text-center">
              <h2 className="font-headline font-bold text-xl text-[#191c1e]">欢迎回来</h2>
              <p className="text-slate-500 text-sm font-medium">请登录您的账户以访问深度研究报告</p>
            </div>

            {/* Form Section */}
            <form className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); onLoginSuccess(); }}>
              {/* Email/Phone Input */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">邮箱或手机号码</label>
                <div className="relative group">
                  <input 
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3.5 text-[#191c1e] placeholder:text-slate-400 focus:ring-1 focus:ring-blue-500 transition-all outline-none" 
                    placeholder="name@company.com" 
                    type="text" 
                  />
                  <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">密码</label>
                  <a className="text-[10px] font-bold text-blue-600 hover:underline transition-all" href="#">忘记密码？</a>
                </div>
                <div className="relative group">
                  <input 
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3.5 text-[#191c1e] placeholder:text-slate-400 focus:ring-1 focus:ring-blue-500 transition-all outline-none" 
                    placeholder="••••••••" 
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

              {/* Remember Me */}
              <label className="flex items-center gap-3 cursor-pointer group w-fit">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-black focus:ring-black" />
                <span className="text-xs font-bold text-slate-500 group-hover:text-slate-900 transition-colors">记住我</span>
              </label>

              {/* Primary Action */}
              <Button className="w-full bg-black text-white hover:bg-slate-800 font-bold py-6 rounded-xl shadow-md transition-all mt-2">
                立即登录
              </Button>
            </form>

            {/* Divider */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full h-[1px] bg-slate-100"></div></div>
              <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-white px-4 text-slate-400 font-bold tracking-widest">或其他方式</span></div>
            </div>

            {/* Social Options */}
            <div className="grid grid-cols-2 gap-4">
              <button className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                <MessageSquare size={16} className="text-slate-500" />
                <span className="text-xs font-bold text-slate-900">微信登录</span>
              </button>
              <button className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                <ShieldCheck size={16} className="text-slate-500" />
                <span className="text-xs font-bold text-slate-900">SSO 登录</span>
              </button>
            </div>

            {/* Footer Link */}
            <p className="text-center text-sm font-medium text-slate-500">
              还没有账号？ <button onClick={onRegisterClick} className="font-bold text-black hover:underline transition-all">立即注册</button>
            </p>
          </div>
        </motion.div>

        {/* Decorative Background Elements */}
        <div className="hidden lg:block absolute top-1/4 right-20 w-64 h-80 rounded-3xl overflow-hidden shadow-2xl rotate-3 opacity-10 pointer-events-none">
          <img className="w-full h-full object-cover" src="https://picsum.photos/seed/trading/400/600" alt="Trading" referrerPolicy="no-referrer" />
        </div>
        <div className="hidden lg:block absolute bottom-1/4 left-20 w-72 h-48 rounded-3xl overflow-hidden shadow-2xl -rotate-6 opacity-10 pointer-events-none">
          <img className="w-full h-full object-cover" src="https://picsum.photos/seed/architecture/600/400" alt="Architecture" referrerPolicy="no-referrer" />
        </div>
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
