import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookOpen, 
  HelpCircle, 
  Grid, 
  FileText, 
  BarChart2, 
  Users, 
  Settings, 
  Bell, 
  Cloud,
  LogOut,
  LogIn,
  UserPlus,
  AlertTriangle,
  Terminal,
  Sun,
  Moon,
  Contrast,
  Activity,
  Share2,
  Search,
  GitCompare
} from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../supabaseClient';
import { useSettings } from '../contexts/SettingsContext';

export const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const { theme, setTheme, language, setLanguage, t } = useSettings();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'vi' ? 'en' : 'vi');
  };

  const ensureUserExists = async (user: any) => {
    try {
      const { data } = await supabase
        .from('users')
        .select('ho_ten')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setUserName(data.ho_ten);
      } else {
        const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown';
        await supabase.from('users').insert({
          user_id: user.id,
          email: user.email,
          ho_ten: name,
          role: 'User'
        });
        setUserName(name);
      }
    } catch (err) {
      console.error('Error ensuring user exists:', err);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/signin');
      } else {
        setUserEmail(session.user?.email || null);
        setUserId(session.user?.id || null);
        if (session.user) ensureUserExists(session.user);
      }
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/signin');
      } else {
        setUserEmail(session.user?.email || null);
        setUserId(session.user?.id || null);
        if (session.user) ensureUserExists(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/signin');
  };

  if (authLoading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-background text-on-background">Loading...</div>;
  }

  const ADMIN_EMAIL = 'minhducle629@gmail.com';
  const isAdmin = userEmail === ADMIN_EMAIL;
  const restrictedPaths = ['/users', '/alerts', '/analytics', '/irt-analysis'];

  const navItems = [
    { name: t('nav.dashboard'), icon: LayoutDashboard, path: '/' },
    { name: t('nav.spatial_map'), icon: Share2, path: '/spatial-map' },
    { name: t('nav.alerts'), icon: AlertTriangle, path: '/alerts' },
    { name: t('nav.knowledge'), icon: BookOpen, path: '/knowledge' },
    { name: t('nav.questions'), icon: HelpCircle, path: '/questions' },
    { name: t('nav.matrix'), icon: Grid, path: '/matrix' },
    { name: t('nav.exams'), icon: FileText, path: '/exams' },
    { name: t('nav.analytics'), icon: BarChart2, path: '/analytics' },
    { name: t('nav.irt'), icon: Activity, path: '/irt-analysis' },
    { name: language === 'vi' ? 'Hồ sơ Ứng viên' : 'Candidates', icon: Users, path: '/candidates' },
    { name: language === 'vi' ? 'So sánh' : 'Compare', icon: GitCompare, path: '/compare' },
    { name: t('nav.users'), icon: Users, path: '/users' },
  ].filter(item => isAdmin || !restrictedPaths.includes(item.path));

  return (
    <div className="flex h-screen bg-background text-on-background overflow-hidden font-sans selection:bg-primary/30">
      {/* Sidebar */}
      <aside className="w-64 glass-panel border-r-0 border-r-outline-variant flex flex-col z-20 transition-all duration-300">
        <div className="p-6">
          <h1 className="text-2xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary tracking-tight">{t('app.title')}</h1>
          <p className="text-[10px] text-on-surface-variant font-mono mt-1 tracking-[0.2em] uppercase opacity-70">{t('app.subtitle')}</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 mt-4 overflow-y-auto flex flex-col">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) => cn(
                  "flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 group relative overflow-hidden",
                  isActive 
                    ? "text-primary shadow-lg shadow-primary/10" 
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-bright/50"
                )}
              >
                {({ isActive }) => (
                  <>
                    {isActive && <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />}
                    <item.icon className={cn(
                      "mr-3 h-5 w-5 transition-all duration-300 z-10",
                      isActive ? "text-primary scale-110" : "text-outline group-hover:text-on-surface group-hover:scale-110"
                    )} />
                    <span className="z-10">{item.name}</span>
                  </>
                )}
              </NavLink>
            );
          })}
          
          <div className="mt-auto pt-4 border-t border-outline-variant/50 space-y-1">
            {isAdmin && (
              <NavLink
                to="/settings"
                className={({ isActive }) => cn(
                  "flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 group relative overflow-hidden",
                  isActive 
                    ? "text-primary shadow-lg shadow-primary/10" 
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-bright/50"
                )}
              >
                {({ isActive }) => (
                  <>
                    {isActive && <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />}
                    <Settings className={cn("mr-3 h-5 w-5 transition-all duration-300 z-10", isActive ? "text-primary scale-110" : "text-outline group-hover:text-on-surface group-hover:scale-110")} />
                    <span className="z-10">{language === 'vi' ? 'Cài đặt' : 'Settings'}</span>
                  </>
                )}
              </NavLink>
            )}
            <NavLink
              to="/support"
              className={({ isActive }) => cn(
                "flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 group relative overflow-hidden",
                isActive 
                  ? "text-primary shadow-lg shadow-primary/10" 
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-bright/50"
              )}
            >
              {({ isActive }) => (
                  <>
                    {isActive && <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />}
                    <HelpCircle className={cn("mr-3 h-5 w-5 transition-all duration-300 z-10", isActive ? "text-primary scale-110" : "text-outline group-hover:text-on-surface group-hover:scale-110")} />
                    <span className="z-10">{language === 'vi' ? 'Hỗ trợ' : 'Support'}</span>
                  </>
                )}
            </NavLink>
          </div>
          
          {userEmail && (
            <div className="pt-4 mt-4 border-t border-outline-variant/50 space-y-2">
              <button 
                onClick={handleSignOut}
                className="w-full flex items-center justify-center px-4 py-2.5 rounded text-sm font-medium transition-all duration-200 text-outline hover:text-error hover:bg-error/10"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {language === 'vi' ? 'Đăng xuất' : 'Sign Out'}
              </button>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-outline-variant">
          <div className="flex items-center px-3 py-3 bg-surface-bright/30 backdrop-blur-sm rounded-lg border border-outline-variant relative group hover:bg-surface-bright/50 transition-colors duration-300">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-on-primary font-bold text-sm mr-3 shrink-0 shadow-lg shadow-primary/20">
              {userName ? userName.charAt(0).toUpperCase() : (userEmail ? userEmail.charAt(0).toUpperCase() : 'U')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-on-surface truncate pr-2">{userName || userEmail || (language === 'vi' ? 'Khách' : 'Guest')}</p>
              <p className="text-xs text-on-surface-variant truncate">{userEmail || ''}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Topbar */}
        <header className="h-16 glass-panel border-b-0 border-b-outline-variant flex items-center justify-between px-8 z-10 sticky top-0">
          <div className="flex items-center">
            <h2 className="text-lg font-display font-semibold tracking-tight text-on-surface">VACT Platform</h2>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-outline" />
              </div>
              <input 
                type="text" 
                placeholder={t('app.search')} 
                className="pl-10 pr-4 py-1.5 bg-surface shadow-sm border border-outline-variant rounded-md text-sm w-64 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-outline-variant"
              />
            </div>
            
            <button 
              onClick={toggleLanguage}
              className="p-2 text-outline hover:text-on-surface transition-colors rounded-full hover:bg-surface-bright shadow-sm font-mono text-xs font-bold"
              title="Toggle Language"
            >
              {language.toUpperCase()}
            </button>

            <button 
              onClick={toggleTheme}
              className="p-2 text-outline hover:text-on-surface transition-colors rounded-full hover:bg-surface-bright shadow-sm"
              title={theme === 'dark' ? "Switch to Light Theme" : "Switch to Dark Theme"}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            
            <button className="p-2 text-outline hover:text-on-surface transition-colors rounded-full hover:bg-surface-bright shadow-sm relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-error shadow-sm"></span>
            </button>
            <button className="p-2 text-primary transition-colors rounded-full bg-primary/10 border border-primary/20">
              <Cloud className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto bg-background">
          <div className="p-8 h-full">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};
