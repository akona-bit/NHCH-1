import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Cpu, 
  MemoryStick, 
  Network, 
  List, 
  TerminalSquare, 
  Power, 
  StopCircle, 
  RotateCw, 
  XCircle, 
  AlertTriangle,
  Code2,
  Clock,
  CheckCircle2,
  Database,
  Users,
  FileText,
  Activity,
  Server
} from 'lucide-react';

export const Dashboard = () => {
  const [stats, setStats] = useState({
    questions: 0,
    assets: 0,
    users: 0,
    candidates: 0,
    exams: 0,
    nodes: 0,
  });
  const [stream, setStream] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] SYS_INIT: Boot sequence verified.`,
    `[${new Date().toLocaleTimeString()}] NET_MGR: Establishing connection with node...`
  ]);
  const [recentExams, setRecentExams] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [
          { count: qCount },
          { count: aCount },
          { count: uCount },
          { count: cCount },
          { count: eCount },
          { count: nCount },
          { data: recentQ },
          { data: recentA },
          { data: recentE }
        ] = await Promise.all([
          supabase.from('cau_hoi').select('*', { count: 'exact', head: true }),
          supabase.from('ngu_lieu').select('*', { count: 'exact', head: true }),
          supabase.from('users').select('*', { count: 'exact', head: true }),
          supabase.from('thi_sinh').select('*', { count: 'exact', head: true }),
          supabase.from('ky_thi').select('*', { count: 'exact', head: true }),
          supabase.from('kien_thuc').select('*', { count: 'exact', head: true }),
          supabase.from('cau_hoi').select('ma_cau_hoi').limit(3),
          supabase.from('ngu_lieu').select('ma_ngu_lieu').order('ma_ngu_lieu', { ascending: false }).limit(3),
          supabase.from('ky_thi').select('*').order('ngay_tao', { ascending: false }).limit(5)
        ]);

        setStats({
          questions: qCount || 0,
          assets: aCount || 0,
          users: uCount || 0,
          candidates: cCount || 0,
          exams: eCount || 0,
          nodes: nCount || 0,
        });

        if (recentE) {
          setRecentExams(recentE);
        }

        const newLogs = [
          `[${new Date().toLocaleTimeString()}] SYS_INIT: Database connected.`,
        ];
        
        recentQ?.forEach(q => {
          newLogs.push(`[${new Date().toLocaleTimeString()}] ALLOC: Synced Question ${q.ma_cau_hoi}`);
        });
        recentA?.forEach(a => {
          newLogs.push(`[${new Date().toLocaleTimeString()}] ALLOC: Synced Asset ${a.ma_ngu_lieu}`);
        });

        setStream(prev => [...prev, ...newLogs]);

      } catch (err) {
        console.error("Error fetching stats:", err);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="h-full flex flex-col bg-transparent text-on-surface font-sans -m-6 overflow-hidden">
      {/* Top Header */}
      <div className="flex justify-between items-center px-8 py-6 shrink-0 z-10 glass-panel border-b-0 border-b-white/5 shadow-md">
        <div className="animate-fade-in">
          <h1 className="text-2xl font-display font-bold text-on-surface tracking-wide flex items-center">
            Dashboard
          </h1>
          <div className="flex items-center text-xs text-outline-variant mt-1">
            <Activity className="w-3.5 h-3.5 mr-1.5 text-primary" />
            <span className="font-mono">System Control Overview</span>
          </div>
        </div>

        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
            <span className="text-primary tracking-wider text-xs">SYS: ONLINE</span>
          </div>
          <div className="flex items-center gap-2 text-outline-variant">
            <Clock className="w-4 h-4" />
            <span className="tracking-wider text-xs">LATENCY: 12ms</span>
          </div>
          <div className="flex items-center gap-3 animate-fade-in delay-200">
            <button className="flex items-center gap-2 px-4 py-2 bg-surface-bright/50 border border-white/10 rounded-lg text-on-surface-variant hover:text-primary hover:border-primary/50 transition-all shadow-sm">
              <TerminalSquare className="w-4 h-4" />
              <span className="text-xs font-semibold">Console</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-secondary hover:from-primary-container hover:to-secondary-container rounded-lg text-white transition-all shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 border-0">
              <Power className="w-4 h-4" />
              <span className="text-xs">Override</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6 animate-slide-up">
            <div className="relative glass-panel rounded-xl p-6 flex flex-col justify-between group hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 border-white/5 hover:border-primary/30 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <div className="flex items-center gap-3 text-outline mb-4 relative z-10">
                <FileText className="w-5 h-5 text-primary" />
                <span className="text-xs tracking-widest uppercase font-bold text-outline">Total Questions</span>
              </div>
              <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary tracking-tight relative z-10">{stats.questions.toLocaleString()}</div>
            </div>

            <div className="relative glass-panel rounded-xl p-6 flex flex-col justify-between group hover:-translate-y-1 hover:shadow-xl hover:shadow-secondary/10 transition-all duration-300 border-white/5 hover:border-secondary/30 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <div className="flex items-center gap-3 text-outline mb-4 relative z-10">
                <MemoryStick className="w-5 h-5 text-secondary" />
                <span className="text-xs tracking-widest uppercase font-bold text-outline">Total Assets</span>
              </div>
              <div className="text-4xl font-bold text-primary tracking-tight">{stats.assets.toLocaleString()}</div>
            </div>

            <div className="relative glass-panel rounded-xl p-6 flex flex-col justify-between group hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 border-white/5 hover:border-primary/30 overflow-hidden delay-100">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <div className="flex items-center gap-3 text-outline mb-4 relative z-10">
                <Users className="w-5 h-5 text-green-500" />
                <span className="text-xs tracking-widest uppercase font-bold text-outline">System Users</span>
              </div>
              <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary tracking-tight relative z-10">{stats.users.toLocaleString()}</div>
            </div>
            
            <div className="relative glass-panel rounded-xl p-6 flex flex-col justify-between group hover:-translate-y-1 hover:shadow-xl hover:shadow-secondary/10 transition-all duration-300 border-white/5 hover:border-secondary/30 overflow-hidden delay-200">
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <div className="flex items-center gap-3 text-outline mb-4 relative z-10">
                <List className="w-5 h-5 text-yellow-500" />
                <span className="text-xs tracking-widest uppercase font-bold text-outline">Entity Status</span>
              </div>
              <div className="flex justify-between items-end">
                <div className="flex flex-col items-center">
                  <span className="text-xl font-bold text-primary">{stats.candidates.toLocaleString()}</span>
                  <span className="text-[10px] text-outline-variant tracking-wider mt-1">CANDIDATES</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-xl font-bold text-error">{stats.exams.toLocaleString()}</span>
                  <span className="text-[10px] text-outline-variant tracking-wider mt-1">EXAMS</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-xl font-bold text-on-surface">{stats.nodes.toLocaleString()}</span>
                  <span className="text-[10px] text-outline-variant tracking-wider mt-1">NODES</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up delay-300">
            {/* System Logs */}
            <div className="glass-panel border-white/5 rounded-xl flex flex-col h-96 overflow-hidden shadow-lg">
              <div className="p-4 border-b border-white/5 bg-surface-bright/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="tracking-widest text-xs font-bold text-on-surface uppercase">Recent Exams</span>
                </div>
              </div>
              
              <div className="p-5 overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="text-outline-variant">
                    <tr>
                      <th className="font-normal px-4 py-3 tracking-wider uppercase text-[10px]">Exam Code</th>
                      <th className="font-normal px-4 py-3 tracking-wider uppercase text-[10px]">Name</th>
                      <th className="font-normal px-4 py-3 tracking-wider uppercase text-[10px]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant text-on-surface">
                    {recentExams.length > 0 ? recentExams.map((exam) => (
                      <tr key={exam.ma_ky_thi} className="hover:bg-surface-bright/50 transition-colors group">
                        <td className="px-4 py-4 font-mono text-primary">{exam.ma_ky_thi}</td>
                        <td className="px-4 py-4 truncate max-w-[150px]" title={exam.ten_ky_thi}>{exam.ten_ky_thi}</td>
                        <td className="px-4 py-4">
                          <span className="px-2 py-1 rounded text-[10px] font-bold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20">
                            {exam.trang_thai || 'Active'}
                          </span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-outline-variant italic">No recent exams found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Terminal Stream */}
            <div className="glass-panel border-white/5 rounded-xl flex flex-col h-96 overflow-hidden shadow-lg">
              <div className="p-4 border-b border-white/5 bg-surface-bright/20 flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary text-sm font-semibold tracking-wider">
                  <Code2 className="w-4 h-4" />
                  TERMINAL STREAM
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-green-500 text-[10px] tracking-wider font-bold">LIVE</span>
                </div>
              </div>
              
              <div className="flex-1 p-5 overflow-auto text-xs leading-relaxed font-mono space-y-2 custom-scrollbar">
                {stream.map((log, index) => (
                  <div key={index} className="text-on-surface">
                    {log.startsWith('>') ? (
                      <div className="text-primary pl-4">{log}</div>
                    ) : log.includes('WARN') ? (
                      <div className="text-tertiary">{log}</div>
                    ) : log.includes('CRITICAL') ? (
                      <div className="text-error">{log}</div>
                    ) : (
                      <div>
                        <span className="text-outline-variant mr-2">{log.substring(0, log.indexOf(']') + 1)}</span>
                        {log.substring(log.indexOf(']') + 1)}
                      </div>
                    )}
                  </div>
                ))}
                <div className="text-primary animate-pulse mt-2">_</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

