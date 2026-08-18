import React, { useState } from 'react';
import { useApp } from '../store/AppContext';
import { Lock, Mail, Eye, EyeOff, User as UserIcon, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
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
      setError('Invalid email or password. Please try again.');
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
      const { error } = await supabase.auth.signUp({
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
        <div className="flex flex-col items-center mb-5 text-center">
          <div className="p-2.5 bg-slate-800 rounded-lg border border-slate-700 shadow-sm mb-2.5">
            <img src="/logo.png" alt="Kiddies" className="h-9 w-auto object-contain" />
          </div>
          <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <span>Kiddies</span>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-[#fe569f]/20 text-[#fe569f] px-2 py-0.5 rounded-md border border-[#fe569f]/40">
              Enterprise
            </span>
          </h1>
          <p className="text-slate-400 text-xs font-normal mt-0.5">Kids Wear & Garment Rental POS</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-elevated border border-slate-200 p-6 sm:p-7">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              {isSignUp ? 'Create Staff Account' : 'Welcome Back'}
            </h2>
            <p className="text-slate-500 text-xs font-normal mt-0.5">
              {isSignUp ? 'Register to manage inventory & sales' : 'Sign in to access your store terminal'}
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
                <div className="bg-rose-50 text-rose-700 px-3 py-2 rounded-md text-xs font-semibold border border-rose-200 flex items-center gap-2">
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
                <div className="bg-emerald-50 text-emerald-700 px-3 py-2 rounded-md text-xs font-semibold border border-emerald-200 flex items-center gap-2">
                  <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
                  <span>{successMessage}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-3">
            <AnimatePresence>
              {isSignUp && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:border-[#01a9fb] focus:bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400"
                      placeholder="Full Name"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:border-[#01a9fb] focus:bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400"
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
                className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:border-[#01a9fb] focus:bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400"
                placeholder="Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {!isSignUp && (
              <div className="flex items-center justify-between pt-0.5 text-xs">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={() => setRememberMe(!rememberMe)}
                    className="rounded border-slate-300 text-[#01a9fb] focus:ring-[#01a9fb] w-3.5 h-3.5"
                  />
                  <span className="text-slate-600 font-medium text-xs">Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-[#01a9fb] font-semibold hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-[#01a9fb] hover:bg-[#0098e6] text-white text-xs font-bold uppercase tracking-wider rounded-md transition-all active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-1.5 !mt-4 shadow-xs"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isSignUp ? 'Register Staff Account' : 'Sign In To Terminal'}</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access */}
          <div className="mt-4 pt-3.5 border-t border-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center mb-2">
              Quick Demo Access
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillDemo('admin@kiddies.store', 'admin')}
                className="px-2.5 py-1.5 bg-slate-50 hover:bg-[#01a9fb]/10 text-slate-700 hover:text-[#01a9fb] border border-slate-200 hover:border-[#01a9fb]/40 rounded-md text-[11px] font-bold transition-all"
              >
                👑 Store Admin
              </button>
              <button
                type="button"
                onClick={() => fillDemo('staff@kiddies.store', 'staff')}
                className="px-2.5 py-1.5 bg-slate-50 hover:bg-[#fe569f]/10 text-slate-700 hover:text-[#fe569f] border border-slate-200 hover:border-[#fe569f]/40 rounded-md text-[11px] font-bold transition-all"
              >
                💼 Store Staff
              </button>
            </div>
          </div>
        </div>

        {/* Toggle Sign Up / Login */}
        <div className="mt-4 text-center">
          <p className="text-xs text-slate-400 font-medium">
            {isSignUp ? 'Already have an account?' : "Need a new staff account?"}{' '}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setSuccessMessage('');
              }}
              className="text-[#01a9fb] font-bold hover:text-[#fe569f] underline ml-1 transition-colors"
            >
              {isSignUp ? 'Sign In' : 'Register Here'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
