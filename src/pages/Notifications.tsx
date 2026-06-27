import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, CheckCircle, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../supabaseClient';
import { useSettings } from '../contexts/SettingsContext';

export const Notifications = () => {
  const { language } = useSettings();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) return;
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.user.id)
        .eq('read', false);
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
  };

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto w-full p-6 space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-display font-bold text-on-surface mb-2 tracking-tight">
            {language === 'vi' ? 'Thông báo' : 'Notifications'}
          </h1>
          <p className="text-sm text-outline font-mono">
            {language === 'vi' ? 'Cập nhật từ hệ thống kiểm duyệt' : 'Updates from the review system'}
          </p>
        </div>
        <button
          onClick={markAllAsRead}
          className="px-4 py-2 bg-surface text-on-surface hover:bg-surface-bright rounded-lg text-sm font-bold transition-all border border-outline-variant flex items-center"
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          {language === 'vi' ? 'Đánh dấu tất cả đã đọc' : 'Mark all as read'}
        </button>
      </div>

      <div className="flex-1 bg-surface border border-outline-variant rounded-xl overflow-hidden flex flex-col shadow-sm">
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex justify-center items-center h-40 text-outline animate-pulse">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-40 text-outline space-y-3 opacity-50">
              <Bell className="w-8 h-8" />
              <p className="font-mono text-sm">{language === 'vi' ? 'Chưa có thông báo nào' : 'No notifications yet'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={cn(
                    "p-4 rounded-lg flex gap-4 transition-all border",
                    notif.read ? "bg-background border-transparent" : "bg-primary/5 border-primary/20 shadow-sm"
                  )}
                >
                  <div className="shrink-0 mt-1">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      notif.read ? "bg-surface-bright text-outline" : "bg-primary text-on-primary"
                    )}>
                      <Bell className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className={cn("font-bold text-sm", notif.read ? "text-on-surface-variant" : "text-on-surface")}>
                        {notif.title}
                      </h3>
                      <span className="text-[10px] font-mono text-outline flex items-center">
                        <Clock className="w-3 h-3 mr-1" /> {formatDate(notif.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-on-surface-variant leading-relaxed">
                      {notif.message}
                    </p>
                  </div>
                  {!notif.read && (
                    <div className="shrink-0 flex items-center">
                      <button 
                        onClick={() => markAsRead(notif.id)}
                        className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors"
                        title="Mark as read"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
