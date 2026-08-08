import React, { useState } from 'react';
import { Eye, EyeOff, ShieldCheck, TrendingUp, Lock, Mail, ArrowRight } from 'lucide-react';

export function Login() {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  // Calculate password strength visually without heavy libraries
  const getPasswordStrength = (pass: string): number => {
    let score = 0;
    if (pass.length > 5) score += 1;
    if (pass.length > 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 1;
    return score;
  };

  const strength = getPasswordStrength(formData.password);
  const passwordsMatch = formData.password === formData.confirmPassword && formData.password.length > 0;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setFormData({ email: '', password: '', confirmPassword: '' });
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  return (
    <div className="min-h-screen flex text-slate-900 bg-slate-50 font-sans">
      
      {/* Left Panel - Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-950 items-center justify-center overflow-hidden">
        {/* Pure CSS Ambient Glow Effects - No GPU required */}
        <div className="absolute top-1/4 -left-10 w-96 h-96 bg-emerald-600 rounded-full mix-blend-screen filter blur-[120px] opacity-40 animate-pulse" style={{ animationDuration: '8s' }}></div>
        <div className="absolute bottom-1/4 -right-10 w-96 h-96 bg-teal-600 rounded-full mix-blend-screen filter blur-[120px] opacity-30 animate-pulse" style={{ animationDuration: '10s' }}></div>
        
        {/* Branding Content */}
        <div className="relative z-10 w-full max-w-md p-8">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-emerald-500/30">
              F
            </div>
            <span className="text-3xl font-bold text-white tracking-tight">FinSight</span>
          </div>
          
          <h1 className="text-5xl font-semibold text-white mb-6 leading-tight">
            Clear vision for your financial future.
          </h1>
          <p className="text-slate-400 text-lg mb-10 leading-relaxed">
            Advanced analytics, smart portfolio tracking, and intelligent insights to help you build and protect your wealth.
          </p>
          
          {/* Feature list */}
          <div className="space-y-5">
            <div className="flex items-center gap-4 text-slate-300">
              <div className="w-10 h-10 rounded-full bg-slate-800/80 flex items-center justify-center border border-slate-700">
                <ShieldCheck size={20} className="text-emerald-400" />
              </div>
              <span className="font-medium">Bank-grade 256-bit encryption</span>
            </div>
            <div className="flex items-center gap-4 text-slate-300">
              <div className="w-10 h-10 rounded-full bg-slate-800/80 flex items-center justify-center border border-slate-700">
                <TrendingUp size={20} className="text-emerald-400" />
              </div>
              <span className="font-medium">Real-time market intelligence</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Forms */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md bg-white lg:bg-transparent rounded-3xl shadow-xl lg:shadow-none p-8 lg:p-0 border border-slate-100 lg:border-none">
          
          {/* Mobile Logo (visible only on smaller screens) */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-emerald-500/30">
              F
            </div>
            <span className="text-2xl font-bold text-slate-900 tracking-tight">FinSight</span>
          </div>

          {/* Form Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              {isLogin ? 'Welcome back' : 'Create an account'}
            </h2>
            <p className="text-slate-500">
              {isLogin 
                ? 'Enter your credentials to access your portfolio.' 
                : 'Start your journey to financial freedom today.'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
            
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail size={18} />
                </div>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-sm"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-700">Password</label>
                {isLogin && <a href="#" className="text-sm text-emerald-600 hover:text-emerald-700 font-semibold transition-colors">Forgot password?</a>}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock size={18} />
                </div>
                <input 
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-sm"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              
              {/* Intelligent Password Strength Meter (Signup Only) */}
              {!isLogin && (
                <div className="pt-2 mb-2">
                  <div className="flex gap-1.5 h-1.5 w-full">
                    <div className={`h-full w-1/4 rounded-full transition-colors duration-300 ${strength >= 1 ? (strength === 1 ? 'bg-red-400' : strength === 2 ? 'bg-orange-400' : 'bg-emerald-500') : 'bg-slate-200'}`}></div>
                    <div className={`h-full w-1/4 rounded-full transition-colors duration-300 ${strength >= 2 ? (strength === 2 ? 'bg-orange-400' : 'bg-emerald-500') : 'bg-slate-200'}`}></div>
                    <div className={`h-full w-1/4 rounded-full transition-colors duration-300 ${strength >= 3 ? (strength === 3 ? 'bg-emerald-400' : 'bg-emerald-500') : 'bg-slate-200'}`}></div>
                    <div className={`h-full w-1/4 rounded-full transition-colors duration-300 ${strength >= 4 ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                  </div>
                  <span className="text-xs text-slate-500 mt-2 block font-medium">Use 8+ characters with a mix of letters, numbers & symbols.</span>
                </div>
              )}
            </div>

            {/* Confirm Password Field (Signup Only) */}
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Confirm Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock size={18} />
                  </div>
                  <input 
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-10 py-3 bg-white border rounded-xl focus:outline-none focus:ring-4 transition-all text-sm ${
                      formData.confirmPassword.length > 0 
                        ? passwordsMatch 
                          ? 'border-emerald-500 focus:ring-emerald-500/10' 
                          : 'border-red-300 focus:ring-red-500/10 focus:border-red-500'
                        : 'border-slate-200 focus:ring-emerald-500/10 focus:border-emerald-500'
                    }`}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {formData.confirmPassword.length > 0 && !passwordsMatch && (
                  <span className="text-xs text-red-500 mt-1 block font-medium">Passwords do not match</span>
                )}
              </div>
            )}

            <button className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-slate-900/20 active:scale-[0.98] mt-8">
              {isLogin ? 'Sign In Securely' : 'Create Free Account'}
              <ArrowRight size={18} />
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-slate-600 font-medium">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              onClick={toggleAuthMode}
              className="text-emerald-600 hover:text-emerald-700 font-bold transition-colors ml-1"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}