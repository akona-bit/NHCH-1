import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { AlertCircle, Terminal, User, Lock, Eye, EyeOff, Network } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

export const SignIn = () => {
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { language } = useSettings();

  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
    }
    if (location.state?.message) {
      setSuccessMsg(location.state.message);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else if (data.session) {
      navigate('/');
    } else {
      setError(language === 'vi' ? 'Tài khoản chưa được xác nhận hoặc có lỗi xảy ra.' : 'Account is not confirmed or an error occurred.');
    }
  };

  return (
    <div className="min-h-screen flex bg-background text-on-background selection:bg-primary/30">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-background border-r border-outline-variant items-center justify-center p-12">
        <div className="relative z-10 max-w-lg text-center">
          <div className="w-16 h-16 bg-surface shadow-sm border border-outline-variant rounded-2xl mb-8 flex items-center justify-center mx-auto">
            <Terminal className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-display font-bold text-on-surface mb-6 tracking-tight">
            VACT Platform
          </h1>
          <p className="text-on-surface-variant text-lg font-light mb-8 leading-relaxed">
            {language === 'vi' 
              ? 'Hệ thống quản lý tài nguyên và sinh ma trận đề thi VNU. Vui lòng đăng nhập để tiếp tục.'
              : 'VNU Asset Management and Matrix Generation Platform. Please sign in to continue.'}
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-10">
            <div className="w-12 h-12 bg-surface shadow-sm border border-outline-variant rounded-xl mx-auto mb-6 flex items-center justify-center">
              <Terminal className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-display font-bold text-on-surface mb-3 tracking-tight">VACT Platform</h1>
          </div>

          <div className="mb-10 lg:mb-12">
            <h2 className="text-3xl font-display font-bold text-on-surface mb-3 tracking-tight">{language === 'vi' ? 'Đăng nhập' : 'Sign In'}</h2>
            <p className="text-sm text-on-surface-variant">{language === 'vi' ? 'Nhập thông tin tài khoản của bạn để tiếp tục' : 'Enter your account details to continue'}</p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-6">
            {successMsg && (
              <div className="flex items-start bg-primary/10 border border-primary/20 rounded-lg p-4 text-primary text-sm">
                <Network className="w-5 h-5 mr-3 mt-0.5 shrink-0" />
                <p>{successMsg}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-on-surface">{language === 'vi' ? 'Tài khoản / Email' : 'Account / Email'}</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-primary">
                  <User className="h-4.5 w-4.5 text-outline group-focus-within:text-primary transition-colors" />
                </div>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-surface border border-outline-variant rounded-lg pl-12 pr-4 py-3.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 text-on-surface transition-all placeholder:text-outline/50 shadow-sm"
                  placeholder="admin@vnu.edu.vn"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-on-surface">{language === 'vi' ? 'Mật khẩu' : 'Password'}</label>
                <a href="#" className="text-sm text-primary font-medium hover:underline transition-colors">{language === 'vi' ? 'Quên mật khẩu?' : 'Forgot password?'}</a>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-4.5 w-4.5 text-outline group-focus-within:text-primary transition-colors" />
                </div>
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-surface border border-outline-variant rounded-lg pl-12 pr-12 py-3.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 text-on-surface transition-all placeholder:text-outline/50 shadow-sm"
                  placeholder="••••••••"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-outline hover:text-on-surface transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="remember" 
                className="w-4.5 h-4.5 rounded border-outline-variant bg-surface accent-primary cursor-pointer" 
              />
              <label htmlFor="remember" className="ml-3 text-sm text-on-surface cursor-pointer select-none">{language === 'vi' ? 'Ghi nhớ đăng nhập' : 'Remember me'}</label>
            </div>

            {error && (
              <div className="flex items-start bg-error/10 border border-error/20 rounded-lg p-4 text-error text-sm">
                <AlertCircle className="w-5 h-5 mr-3 mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 bg-primary text-on-primary font-medium rounded-lg text-sm flex items-center justify-center hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50 mt-2"
            >
              {loading ? (language === 'vi' ? 'Đang xử lý...' : 'Processing...') : (language === 'vi' ? 'Đăng nhập' : 'Sign In')}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-on-surface-variant">
              {language === 'vi' ? 'Chưa có tài khoản?' : 'Don\'t have an account?'} <Link to="/signup" className="text-primary font-medium hover:underline underline-offset-4">{language === 'vi' ? 'Đăng ký ngay' : 'Sign up now'}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

