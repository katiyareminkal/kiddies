
import React, { useState } from 'react';
import { useApp } from '../store/AppContext';
import { Lock, Mail, Eye, EyeOff, Shirt, Sun, Cloud, Heart, Star, Baby, User as UserIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../supabase';

const Login: React.FC = () => {
  const { login, loginWithGoogle } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    const success = await login(email, password);
    if (!success) {
      setError('Invalid email or password');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!fullName.trim()) {
      setError('Full name is required');
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: fullName.trim(),
            role: 'STAFF' // Default role
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
  };

  const handleForgotPassword = async () => {
    setError('');
    setSuccessMessage('');
    if (!email.trim()) {
      setError('Please enter your email address in the input field first.');
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
    <div className="min-h-screen bg-[#FFF9F0] flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Decorative Background Elements */}
      <div className="absolute top-10 left-10 text-[#FFB7B7] opacity-40 animate-bounce" style={{ animationDuration: '3s' }}>
        <Heart size={48} fill="currentColor" />
      </div>
      <div className="absolute top-20 right-20 text-[#FFD93D] opacity-60 animate-pulse">
        <Sun size={80} strokeWidth={1.5} />
      </div>
      <div className="absolute bottom-20 left-20 text-[#6AD4DD] opacity-40">
        <Cloud size={64} fill="currentColor" />
      </div>
      <div className="absolute bottom-10 right-10 text-[#A084E8] opacity-40 animate-spin" style={{ animationDuration: '10s' }}>
        <Star size={48} fill="currentColor" />
      </div>
      <div className="absolute top-1/2 left-10 -translate-y-1/2 text-[#F99417] opacity-30">
        <Baby size={56} />
      </div>
      <div className="absolute top-1/3 right-10 text-[#FF8AAE] opacity-30">
        <Heart size={32} fill="currentColor" />
      </div>
      <div className="absolute bottom-1/3 right-20 text-[#6AD4DD] opacity-30">
        <Cloud size={40} fill="currentColor" />
      </div>

      {/* Background Shapes */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-[#FFE5E5] rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl opacity-50"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#E5F9FF] rounded-full translate-x-1/3 translate-y-1/3 blur-3xl opacity-50"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[440px] bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] p-10 relative z-10 border border-white/50"
      >
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.png" alt="Kiddies Logo" className="h-20 object-contain mb-2" />
          <div className="flex items-center gap-3 text-[#A084E8] text-[10px] font-bold uppercase tracking-[0.3em]">
            <div className="h-[1.5px] w-6 bg-[#A084E8]/30"></div>
            kids wear
            <div className="h-[1.5px] w-6 bg-[#A084E8]/30"></div>
          </div>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-[#2D3648] mb-1">
            {isSignUp ? 'Create Account' : 'Welcome Back!'}
          </h2>
          <p className="text-[#718096] text-sm">
            {isSignUp ? 'Sign up for a new management account' : 'Sign in to continue to your account'}
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 text-red-500 p-4 rounded-2xl text-xs font-bold text-center border border-red-100 animate-nano">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-6 bg-emerald-50 text-emerald-600 p-4 rounded-2xl text-xs font-bold text-center border border-emerald-100 animate-nano">
            {successMessage}
          </div>
        )}

        <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-5">
          {isSignUp && (
            <div className="relative animate-nano">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A0AEC0]" size={20} />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white border border-[#E2E8F0] rounded-2xl outline-none focus:border-[#A084E8] transition-all text-[#2D3648] placeholder-[#A0AEC0]"
                placeholder="Full Name"
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A0AEC0]" size={20} />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-[#E2E8F0] rounded-2xl outline-none focus:border-[#A084E8] transition-all text-[#2D3648] placeholder-[#A0AEC0]"
              placeholder="Email Address"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A0AEC0]" size={20} />
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-12 py-4 bg-white border border-[#E2E8F0] rounded-2xl outline-none focus:border-[#A084E8] transition-all text-[#2D3648] placeholder-[#A0AEC0]"
              placeholder="Password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A0AEC0] hover:text-[#718096]"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {!isSignUp && (
            <div className="flex items-center justify-between px-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${rememberMe ? 'bg-[#FF7B7B] border-[#FF7B7B]' : 'bg-white border-[#E2E8F0] group-hover:border-[#FF7B7B]'}`}>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={rememberMe}
                    onChange={() => setRememberMe(!rememberMe)}
                  />
                  {rememberMe && <div className="w-2 h-2 bg-white rounded-full"></div>}
                </div>
                <span className="text-sm text-[#4A5568] font-medium">Remember me</span>
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-[#A084E8] font-semibold hover:underline"
              >
                Forgot Password?
              </button>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-4 bg-[#8B5CF6] text-white font-bold rounded-2xl shadow-[0_10px_20px_rgba(139,92,246,0.3)] hover:bg-[#7C3AED] transition-all active:scale-[0.98]"
          >
            {isSignUp ? 'Sign Up' : 'Login'}
          </button>
        </form>

        <div className="mt-8 relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E2E8F0]"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-4 text-[#A0AEC0] font-medium italic">or</span>
          </div>
        </div>

        <button
          onClick={() => loginWithGoogle()}
          className="w-full mt-6 py-4 bg-white border border-[#E2E8F0] rounded-2xl flex items-center justify-center gap-3 hover:bg-[#F7FAFC] transition-all font-semibold text-[#4A5568]"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          Continue with Google
        </button>

        <div className="mt-8 text-center">
          <p className="text-sm text-[#718096]">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setSuccessMessage('');
              }}
              className="text-[#A084E8] font-bold hover:underline"
            >
              {isSignUp ? 'Login' : 'Sign up'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
