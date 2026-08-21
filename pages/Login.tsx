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
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-6 relative font-sans select-none">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-[400px] relative z-10"
      >
        {/* Branding Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <img
            src="/logo.png"
            alt="Kids Wear Logo"
            className="h-16 w-auto object-contain mb-2.5 transition-transform hover:scale-105"
          />
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Kids Wear
          </h1>
          <p className="text-slate-500 text-xs font-bold mt-0.5 tracking-wide">
            Rental & Stock Management
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/90 p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              Store Sign In
            </h2>
            <p className="text-slate-500 text-xs font-semibold mt-0.5">
              Enter your credentials to access the terminal
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
                <div className="bg-rose-50 text-rose-700 px-3.5 py-2.5 rounded-xl text-xs font-bold border border-rose-200 flex items-center gap-2.5 shadow-2xs">
                  <AlertCircle size={15} className="shrink-0 text-rose-600" />
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
                <div className="bg-emerald-50 text-emerald-700 px-3.5 py-2.5 rounded-xl text-xs font-bold border border-emerald-200 flex items-center gap-2.5 shadow-2xs">
                  <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
                  <span>{successMessage}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5 ml-0.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-[#01a9fb] rounded-xl outline-none text-xs font-semibold text-slate-900 placeholder:text-slate-400 transition-all shadow-2xs focus:ring-2 focus:ring-[#01a9fb]/15"
                  placeholder="admin@store.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5 ml-0.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-[#01a9fb] rounded-xl outline-none text-xs font-semibold text-slate-900 placeholder:text-slate-400 transition-all shadow-2xs focus:ring-2 focus:ring-[#01a9fb]/15"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-[#01a9fb] focus:ring-[#01a9fb] w-3.5 h-3.5 cursor-pointer"
                />
                <span className="text-slate-600 font-semibold text-xs">Remember me</span>
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs text-[#01a9fb] hover:text-[#0088cc] font-bold transition-colors"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#01a9fb] hover:bg-[#0098e6] active:scale-[0.99] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2 !mt-5 shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/30"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={15} strokeWidth={2.5} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security Notice */}
        <div className="mt-5 text-center">
          <p className="text-[11px] text-slate-500 font-semibold">
            🔒 Secure Store Terminal • Access for Authorized Personnel Only
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
