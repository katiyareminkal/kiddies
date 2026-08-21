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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 sm:p-6 relative font-sans select-none">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-[400px] relative z-10"
      >
        {/* Branding Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/80 shadow-md mb-3">
            <img src="/logo.png" alt="Kids Wear Logo" className="h-12 w-auto object-contain" />
          </div>
          <h1 className="text-xl font-black text-white tracking-tight">
            Kids Wear
          </h1>
          <p className="text-slate-400 text-xs font-semibold mt-1 tracking-wide">
            Rental & Stock Management
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/90 p-6 sm:p-7 backdrop-blur-sm">
          <div className="mb-5">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              Store Sign In
            </h2>
            <p className="text-slate-500 text-xs font-semibold mt-0.5">
              Enter your credentials to manage your store
            </p>
          </div>

          {/* Feedback Messages */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-3.5 overflow-hidden"
              >
                <div className="bg-rose-50 text-rose-700 px-3 py-2 rounded-xl text-xs font-bold border border-rose-200 flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              </motion.div>
            )}
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-3.5 overflow-hidden"
              >
                <div className="bg-emerald-50 text-emerald-700 px-3 py-2 rounded-xl text-xs font-bold border border-emerald-200 flex items-center gap-2">
                  <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
                  <span>{successMessage}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#01a9fb] focus:bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 transition-all"
                placeholder="Email Address"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#01a9fb] focus:bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 transition-all"
                placeholder="Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            <div className="flex items-center justify-between pt-0.5 text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={() => setRememberMe(!rememberMe)}
                  className="rounded border-slate-300 text-[#01a9fb] focus:ring-[#01a9fb] w-3.5 h-3.5"
                />
                <span className="text-slate-600 font-semibold text-xs">Remember me</span>
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs text-[#01a9fb] font-bold hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#01a9fb] hover:bg-[#0098e6] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-1.5 !mt-5 shadow-sm shadow-blue-500/20"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security / Admin notice */}
        <div className="mt-4 text-center">
          <p className="text-[11px] text-slate-500 font-medium">
            🔒 Authorized staff & management access only. New accounts are provisioned by Store Admin.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
