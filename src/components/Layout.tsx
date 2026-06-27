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
  GitCompare,
  CheckCircle2
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
  const [unreadCount, setUnreadCount] = useState(0);
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
          ho_ten: name
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

    return () => { subscription.unsubscribe(); };
  }, [navigate]);

  useEffect(() => {
    if (!userId) return;
    const fetchUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);
      setUnreadCount(count || 0);
    };
    fetchUnread();
    
    const sub = supabase.channel('public:notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, fetchUnread)
      .subscribe();
      
    return () => {
      supabase.removeChannel(sub);
    };
  }, [userId]);

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

  const navSections = [
    {
      title: language === 'vi' ? 'Tổng quan' : 'Overview',
      items: [
        { name: t('nav.dashboard'), icon: LayoutDashboard, path: '/' },
        { name: t('nav.spatial_map'), icon: Share2, path: '/spatial-map' },
        { name: t('nav.alerts'), icon: AlertTriangle, path: '/alerts' },
      ]
    },
    {
      title: language === 'vi' ? 'Quản lý Nội dung' : 'Content Management',
      items: [
        { name: t('nav.knowledge'), icon: BookOpen, path: '/knowledge' },
        { name: t('nav.questions'), icon: HelpCircle, path: '/questions' },
        { name: language === 'vi' ? 'Duyệt câu hỏi' : 'Pending Review', icon: CheckCircle2, path: '/questions/review' },
      ]
    },
    {
      title: language === 'vi' ? 'Khảo thí' : 'Assessment',
      items: [
        { name: t('nav.matrix'), icon: Grid, path: '/matrix' },
        { name: t('nav.exams'), icon: FileText, path: '/exams' },
        { name: t('nav.irt'), icon: Activity, path: '/irt-analysis' },
      ]
    },
    {
      title: language === 'vi' ? 'Hệ thống' : 'System',
      items: [
        { name: t('nav.analytics'), icon: BarChart2, path: '/analytics' },
        { name: language === 'vi' ? 'Hồ sơ Ứng viên' : 'Candidates', icon: Users, path: '/candidates' },
        { name: language === 'vi' ? 'So sánh' : 'Compare', icon: GitCompare, path: '/compare' },
        { name: t('nav.users'), icon: Users, path: '/users' },
      ]
    }
  ];

  const filteredNavSections = navSections.map(section => ({
    ...section,
    items: section.items.filter(item => isAdmin || !restrictedPaths.includes(item.path))
  })).filter(section => section.items.length > 0);

  return (
    <div className="flex h-screen bg-background text-on-background overflow-hidden font-sans selection:bg-primary/30">
      {/* Sidebar */}
      <aside className="w-72 bg-surface/50 backdrop-blur-xl border-r border-outline-variant/30 flex flex-col z-20 transition-all duration-300 shadow-[4px_0_24px_-4px_rgba(0,0,0,0.1)]">
        <div className="p-6 pb-2 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary" />
          <h1 className="text-2xl font-display font-black text-transparent bg-clip-text bg-gradient-to-br from-primary via-secondary to-primary tracking-tight mt-2">{t('app.title')}</h1>
          <p className="text-[10px] text-on-surface-variant font-mono mt-1.5 tracking-[0.25em] uppercase font-bold">{t('app.subtitle')}</p>
        </div>

        <nav className="flex-1 px-4 py-4 overflow-y-auto flex flex-col gap-8 custom-scrollbar">
          {filteredNavSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <h3 className="px-4 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-outline mb-3">
                {section.title}
              </h3>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isItemActive = item.path === '/questions' 
                    ? location.pathname === '/questions' || (location.pathname.startsWith('/questions/') && !location.pathname.startsWith('/questions/review'))
                    : location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));

                  return (
                    <NavLink
                      key={item.name}
                      to={item.path}
                      className={() => cn(
                        "flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 group relative overflow-hidden",
                        isItemActive
                          ? "text-primary bg-primary/10 shadow-sm"
                          : "text-on-surface-variant hover:text-on-surface hover:bg-surface-bright/50"
                      )}
                    >
                      {() => (
                        <>
                          {isItemActive && <div className="absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r bg-primary" />}
                          <item.icon className={cn(
                            "mr-3 h-5 w-5 transition-all duration-300",
                            isItemActive ? "text-primary" : "text-outline group-hover:text-on-surface"
                          )} />
                          <span>{item.name}</span>
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="mt-auto pt-6 border-t border-outline-variant/30 space-y-0.5">
            {isAdmin && (
              <NavLink
                to="/settings"
                className={({ isActive }) => cn(
                  "flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 group relative overflow-hidden",
                  isActive
                    ? "text-primary bg-primary/10 shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-bright/50"
                )}
              >
                {({ isActive }) => (
                  <>
                    {isActive && <div className="absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r bg-primary" />}
                    <Settings className={cn("mr-3 h-5 w-5 transition-all duration-300", isActive ? "text-primary" : "text-outline group-hover:text-on-surface")} />
                    <span>{language === 'vi' ? 'Cài đặt' : 'Settings'}</span>
                  </>
                )}
              </NavLink>
            )}
            <NavLink
              to="/support"
              className={({ isActive }) => cn(
                "flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 group relative overflow-hidden",
                isActive
                  ? "text-primary bg-primary/10 shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-bright/50"
              )}
            >
              {({ isActive }) => (
                <>
                  {isActive && <div className="absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r bg-primary" />}
                  <HelpCircle className={cn("mr-3 h-5 w-5 transition-all duration-300", isActive ? "text-primary" : "text-outline group-hover:text-on-surface")} />
                  <span>{language === 'vi' ? 'Hỗ trợ' : 'Support'}</span>
                </>
              )}
            </NavLink>
            
            {userEmail && (
              <button
                onClick={handleSignOut}
                className="w-full mt-2 flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 text-outline hover:text-error hover:bg-error/10"
              >
                <LogOut className="mr-3 h-5 w-5" />
                {language === 'vi' ? 'Đăng xuất' : 'Sign Out'}
              </button>
            )}
          </div>
        </nav>

        <div className="p-4 border-t border-outline-variant/30">
          <div className="flex items-center px-4 py-3 bg-surface rounded-xl border border-outline-variant/50 relative group hover:border-primary/30 transition-all duration-300 shadow-sm">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-on-primary font-bold text-sm mr-3 shrink-0 shadow-inner">
              {userName ? userName.charAt(0).toUpperCase() : (userEmail ? userEmail.charAt(0).toUpperCase() : 'U')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-on-surface truncate pr-2 group-hover:text-primary transition-colors">{userName || userEmail || (language === 'vi' ? 'Khách' : 'Guest')}</p>
              <p className="text-xs text-on-surface-variant truncate font-mono mt-0.5">{userEmail || ''}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative bg-background">
        {/* Topbar */}
        <header className="h-16 bg-surface/80 backdrop-blur-md border-b border-outline-variant/30 flex items-center justify-between px-8 z-10 sticky top-0 shadow-sm">
          <div className="flex items-center">
            {/* Optional breadcrumbs or page title could go here */}
          </div>

          <div className="flex items-center space-x-3">
            <div className="relative group mr-4">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-outline group-focus-within:text-primary transition-colors" />
              </div>
              <input
                type="text"
                placeholder={t('app.search')}
                className="pl-10 pr-4 py-2 bg-background border border-outline-variant/50 rounded-full text-sm w-72 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-outline-variant text-on-surface shadow-inner"
              />
            </div>

            <button
              onClick={toggleLanguage}
              className="px-3 py-2 text-outline hover:text-on-surface transition-all rounded-full hover:bg-surface-bright border border-transparent hover:border-outline-variant/50 shadow-sm font-mono text-xs font-bold flex items-center justify-center"
              title="Toggle Language"
            >
              {language.toUpperCase()}
            </button>

            <div className="w-px h-5 bg-outline-variant/50 mx-1"></div>

            <button
              onClick={toggleTheme}
              className="p-2 text-outline hover:text-primary transition-all rounded-full hover:bg-surface-bright shadow-sm hover:scale-110"
              title={theme === 'dark' ? "Switch to Light Theme" : "Switch to Dark Theme"}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            <button 
              onClick={() => navigate('/notifications')}
              className="p-2 text-outline hover:text-primary transition-all rounded-full hover:bg-surface-bright shadow-sm relative hover:scale-110"
              title="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-error text-[9px] font-bold text-white shadow-sm ring-2 ring-surface">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <button className="p-2 text-primary transition-all rounded-full bg-primary/10 border border-primary/20 hover:bg-primary hover:text-on-primary hover:shadow-lg hover:shadow-primary/20 ml-2">
              <Cloud className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-8 h-full max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};
