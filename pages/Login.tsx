import React, { useState, useEffect } from 'react';
import { useApp } from '../store/AppContext';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  X,
  Shield,
  User,
  KeyRound
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';

const Login: React.FC = () => {
  const { login, storeProfile } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Forgot password modal state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  // Load saved email if remembered
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem('kiddies_saved_login_email');
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      const success = await login(email.trim(), password);
      if (success) {
        if (rememberMe) {
          try {
            localStorage.setItem('kiddies_saved_login_email', email.trim());
          } catch {}
        } else {
          try {
            localStorage.removeItem('kiddies_saved_login_email');
          } catch {}
        }
      } else {
        setError('Incorrect email or password. Please try again.');
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to sign in. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    if (!forgotEmail.trim()) {
      setForgotError('Please enter your email address.');
      return;
    }

    setForgotLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setForgotSuccess('Instructions have been sent to your email with a recovery link.');
    } catch (err: any) {
      setForgotError(err.message || 'Unable to send reset instructions.');
    } finally {
      setForgotLoading(false);
    }
  };

  const quickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
    setSuccessMessage('');
  };

  return (
    <div className="min-h-screen bg-[#FAFAFC] relative flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Delicate background ambient gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#01a9fb]/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#fe569f]/6 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-[420px] relative z-10"
      >
        {/* Brand Header */}
        <div className="text-center mb-6 flex flex-col items-center">
          <img
            src={storeProfile?.logo || '/icon.png'}
            alt="Stock & Rentals Logo"
            referrerPolicy="no-referrer"
            className="h-24 sm:h-28 w-auto object-contain mb-3 drop-shadow-md transition-transform hover:scale-105 duration-200"
          />
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-200/90 rounded-full shadow-2xs mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#01a9fb]" />
            <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider">
              Stock & Rental Management
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Sign in to manage inventory, rentals & sales
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(15,23,42,0.06)] p-6 sm:p-8">
          {/* Alerts */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-5 overflow-hidden"
              >
                <div className="bg-rose-50 text-rose-700 px-3.5 py-2.5 rounded-2xl text-xs font-semibold border border-rose-200 flex items-start gap-2.5">
                  <AlertCircle size={16} className="shrink-0 text-rose-500 mt-0.5" />
                  <span className="flex-1 leading-snug">{error}</span>
                  <button
                    type="button"
                    onClick={() => setError('')}
                    className="text-rose-400 hover:text-rose-700 p-0.5"
                  >
                    <X size={13} />
                  </button>
                </div>
              </motion.div>
            )}

            {successMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-5 overflow-hidden"
              >
                <div className="bg-emerald-50 text-emerald-700 px-3.5 py-2.5 rounded-2xl text-xs font-semibold border border-emerald-200 flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                  <span>{successMessage}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 ml-1">
                Email
              </label>
              <div className="relative group">
                <Mail
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#01a9fb] transition-colors"
                  size={17}
                />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@kiddies.store"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50/80 border border-slate-200/90 focus:bg-white focus:border-[#01a9fb] focus:ring-4 focus:ring-[#01a9fb]/10 rounded-2xl outline-none text-xs sm:text-sm font-semibold text-slate-900 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5 ml-1">
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setForgotError('');
                    setForgotSuccess('');
                    setIsForgotModalOpen(true);
                  }}
                  className="text-xs text-[#01a9fb] hover:text-[#008ecf] font-semibold transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative group">
                <Lock
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#01a9fb] transition-colors"
                  size={17}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3 bg-slate-50/80 border border-slate-200/90 focus:bg-white focus:border-[#01a9fb] focus:ring-4 focus:ring-[#01a9fb]/10 rounded-2xl outline-none text-xs sm:text-sm font-semibold text-slate-900 transition-all placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded-md border-slate-300 text-[#01a9fb] focus:ring-[#01a9fb] w-4 h-4 cursor-pointer"
                />
                <span className="text-slate-600 font-medium text-xs">
                  Remember me
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#01a9fb] hover:bg-[#0098e6] active:scale-[0.99] text-white text-xs sm:text-sm font-bold rounded-2xl transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm hover:shadow-md hover:shadow-[#01a9fb]/20 cursor-pointer !mt-5"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing in...</span>
                </div>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} strokeWidth={2.4} />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access Bar */}
          <div className="pt-6 mt-6 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Demo Accounts
              </span>
              <span className="text-[10px] text-slate-400">Click to autofill</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => quickFill('admin@kiddies.store', 'admin')}
                className="group p-2.5 rounded-2xl bg-slate-50 hover:bg-[#01a9fb]/5 border border-slate-200/80 hover:border-[#01a9fb]/40 transition-all text-left flex items-center gap-2.5"
              >
                <div className="w-7 h-7 rounded-xl bg-white border border-slate-200 text-[#01a9fb] flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-[#01a9fb] group-hover:text-white group-hover:border-[#01a9fb] transition-colors">
                  <Shield size={14} strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 leading-tight">Admin</p>
                  <p className="text-[10px] text-slate-400 truncate">Full store</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => quickFill('staff@kiddies.store', 'staff')}
                className="group p-2.5 rounded-2xl bg-slate-50 hover:bg-[#fe569f]/5 border border-slate-200/80 hover:border-[#fe569f]/40 transition-all text-left flex items-center gap-2.5"
              >
                <div className="w-7 h-7 rounded-xl bg-white border border-slate-200 text-[#fe569f] flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-[#fe569f] group-hover:text-white group-hover:border-[#fe569f] transition-colors">
                  <User size={14} strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 leading-tight">Staff</p>
                  <p className="text-[10px] text-slate-400 truncate">POS & counter</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Minimal Footer */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Secure Cloud Connection</span>
          </div>
        </div>
      </motion.div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {isForgotModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl border border-slate-100 text-slate-900 relative"
            >
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(false)}
                className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X size={16} />
              </button>

              <div className="w-10 h-10 rounded-2xl bg-[#01a9fb]/10 text-[#01a9fb] flex items-center justify-center mb-3.5">
                <KeyRound size={20} strokeWidth={2.2} />
              </div>

              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Reset password
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                Enter your account email to receive instructions to reset your password.
              </p>

              {forgotError && (
                <div className="mt-3 bg-rose-50 text-rose-700 p-2.5 rounded-xl text-xs font-semibold border border-rose-200 flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{forgotError}</span>
                </div>
              )}

              {forgotSuccess && (
                <div className="mt-3 bg-emerald-50 text-emerald-700 p-2.5 rounded-xl text-xs font-semibold border border-emerald-200 flex items-center gap-2">
                  <CheckCircle2 size={14} className="shrink-0" />
                  <span>{forgotSuccess}</span>
                </div>
              )}

              <form onSubmit={handleForgotPassword} className="mt-4 space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 ml-1">
                    Your email address
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@kiddies.store"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#01a9fb] focus:bg-white rounded-xl outline-none text-xs sm:text-sm font-semibold text-slate-900 transition-all"
                  />
                </div>

                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[#01a9fb] hover:bg-[#0098e6] text-white shadow-xs transition-colors disabled:opacity-50"
                  >
                    {forgotLoading ? 'Sending...' : 'Send Link'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Login;
