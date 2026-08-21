import React, { useState } from 'react';
import { useApp } from '../store/AppContext';
import { Lock, Mail, Eye, EyeOff, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';

const Login: React.FC = () => {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);
    const success = await login(email, password);
    if (!success) {
      setError('Invalid email or password. Please try again.');
    }
    setIsLoading(false);
  };

  const handleForgotPassword = async () => {
    setError('');
    setSuccessMessage('');
    if (!email.trim()) {
      setError('Please enter your email address first.');
    } else {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin
        });
        if (error) throw error;
        setSuccessMessage('A password reset link has been sent to your email.');
      } catch (err: any) {
        setError(err.message || 'Failed to send password reset link');
      }
    }
  };

  const fillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
    setSuccessMessage('');
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center p-4 sm:p-6 relative font-sans select-none">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-[430px] relative z-10"
      >
        {/* Branding Header */}
        <div className="flex flex-col items-center mb-7 text-center">
          <img
            src="/logo.png"
            alt="Kids Wear Logo"
            className="h-20 w-auto object-contain mb-3 transition-transform hover:scale-105"
          />
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Kids Wear
          </h1>
          <div className="inline-flex items-center gap-2 mt-1.5 px-3 py-1 bg-slate-200/70 border border-slate-300/60 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#01a9fb] animate-pulse" />
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-600">
              Rental & Stock Terminal
            </span>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-[28px] shadow-lg shadow-slate-300/40 border border-slate-200/90 p-7 sm:p-9">
          <div className="mb-6">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Welcome back
            </h2>
            <p className="text-slate-500 text-sm font-medium mt-1">
              Please enter your details to sign in
            </p>
          </div>

          {/* Feedback Messages */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 overflow-hidden"
              >
                <div className="bg-rose-50 text-rose-700 px-4 py-3 rounded-2xl text-xs font-bold border border-rose-200 flex items-center gap-2.5 shadow-2xs">
                  <AlertCircle size={16} className="shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              </motion.div>
            )}
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 overflow-hidden"
              >
                <div className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-2xl text-xs font-bold border border-emerald-200 flex items-center gap-2.5 shadow-2xs">
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                  <span>{successMessage}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5 ml-1">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#01a9fb] transition-colors" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 focus:border-[#01a9fb] focus:bg-white rounded-2xl outline-none text-sm font-semibold text-slate-900 placeholder:text-slate-400 transition-all shadow-xs focus:ring-4 focus:ring-[#01a9fb]/10"
                  placeholder="admin@kiddies.store"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5 ml-1">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#01a9fb] transition-colors" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-3.5 bg-slate-50 border border-slate-200 focus:border-[#01a9fb] focus:bg-white rounded-2xl outline-none text-sm font-semibold text-slate-900 placeholder:text-slate-400 transition-all shadow-xs focus:ring-4 focus:ring-[#01a9fb]/10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded-md border-slate-300 text-[#01a9fb] focus:ring-[#01a9fb] w-4 h-4 cursor-pointer"
                />
                <span className="text-slate-600 font-semibold text-xs">Remember me</span>
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs text-[#01a9fb] hover:text-[#0088cc] font-black transition-colors"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-[#01a9fb] hover:bg-[#0098e6] active:scale-[0.98] text-white text-sm font-black uppercase tracking-wider rounded-2xl transition-all disabled:opacity-60 flex items-center justify-center gap-2 !mt-6 shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/30"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={17} strokeWidth={2.8} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security Notice */}
        <div className="mt-5 text-center">
          <p className="text-xs text-slate-400 font-semibold flex items-center justify-center gap-1.5">
            <span>🔒 Authorized Store Access Only</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
