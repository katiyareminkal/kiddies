
import React, { useState } from 'react';
import { useApp } from '../store/AppContext';
import { Lock, Mail, Eye, EyeOff, User as UserIcon, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';

const Login: React.FC = () => {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);
    const success = await login(email, password);
    if (!success) {
      setError('Invalid email or password');
    }
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!fullName.trim()) {
      setError('Full name is required');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: fullName.trim(),
            role: 'STAFF'
          }
        }
      });

      if (error) throw error;

      setSuccessMessage('Registration successful! You can now log in.');
      setIsSignUp(false);
      setFullName('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to register account');
    }
    setIsLoading(false);
  };

  const handleForgotPassword = async () => {
    setError('');
    setSuccessMessage('');
    if (!email.trim()) {
      setError('Please enter your email address first.');
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin
      });
      if (error) throw error;
      setSuccessMessage('A password reset link has been sent to your email.');
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset link');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-5 relative overflow-hidden font-sans">
      {/* Subtle background accent */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-violet-100/60 to-sky-100/40 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-rose-100/40 to-amber-100/30 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-[400px] relative z-10"
      >
        {/* Logo & Branding */}
        <div className="flex flex-col items-center mb-10">
          <img src="/kiddies-wordmark.png" alt="Kiddies" className="h-14 w-auto object-contain mb-2 drop-shadow-[0_6px_12px_rgba(0,0,0,0.08)]" />
          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-[0.25em]">Stock Manager</span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-7">
          {/* Header */}
          <div className="mb-7">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {isSignUp ? 'Create Account' : 'Welcome back'}
            </h2>
            <p className="text-slate-400 text-xs mt-1 font-medium">
              {isSignUp ? 'Sign up for a new account' : 'Sign in to your account'}
            </p>
          </div>

          {/* Error / Success */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-5 overflow-hidden"
              >
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-xs font-semibold border border-red-100">
                  {error}
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
                <div className="bg-emerald-50 text-emerald-600 px-4 py-3 rounded-xl text-xs font-semibold border border-emerald-100">
                  {successMessage}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-4">
            <AnimatePresence>
              {isSignUp && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={17} />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-violet-400 focus:bg-white transition-all text-sm text-slate-800 placeholder-slate-400 font-medium"
                      placeholder="Full name"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={17} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-violet-400 focus:bg-white transition-all text-sm text-slate-800 placeholder-slate-400 font-medium"
                placeholder="Email address"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={17} />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-11 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-violet-400 focus:bg-white transition-all text-sm text-slate-800 placeholder-slate-400 font-medium"
                placeholder="Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>

            {!isSignUp && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center transition-all ${rememberMe ? 'bg-violet-500 border-violet-500' : 'border-slate-300 group-hover:border-violet-400'}`}>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={rememberMe}
                      onChange={() => setRememberMe(!rememberMe)}
                    />
                    {rememberMe && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 font-medium">Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-violet-500 font-semibold hover:text-violet-600 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isSignUp ? 'Create Account' : 'Sign In'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Toggle Sign Up / Login */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-400 font-medium">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setSuccessMessage('');
              }}
              className="text-violet-500 font-bold hover:text-violet-600 transition-colors"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
