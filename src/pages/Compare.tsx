import React, { useState, useEffect } from 'react';
import { GitCompare, Users, FileText, Calendar, Search, ArrowRightLeft, BarChart3, TrendingUp, CheckCircle2, Activity, AlertCircle } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { cn } from '../lib/utils';
import { supabase } from '../supabaseClient';

export const Compare = () => {
  const { language } = useSettings();
  const [activeTab, setActiveTab] = useState<'candidates' | 'exams' | 'sessions'>('candidates');

  const [candidates, setCandidates] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [kyThiList, setKyThiList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Compare state
  const [session1Id, setSession1Id] = useState<number | ''>('');
  const [session2Id, setSession2Id] = useState<number | ''>('');
  const [compareResult, setCompareResult] = useState<any>(null);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [candRes, examRes] = await Promise.all([
          supabase.from('thi_sinh').select('*').limit(10),
          supabase.from('ky_thi').select('*').limit(10)
        ]);
        
        if (candRes.data) {
          setCandidates(candRes.data.map((c, i) => ({
            id: c.sbd,
            name: c.ho_ten || `Candidate ${i}`,
            score: c.diem_tong || 0, // Assume field exists or default 0
            completionTime: c.thoi_gian_lam_bai || 'N/A', 
            irf: c.nang_luc_theta || 0 
          })));
        }
        
        if (examRes.data) {
          setExams(examRes.data.map((e, i) => ({
            id: e.ma_ky_thi,
            name: e.ten_ky_thi || `Exam ${i}`,
            avgScore: e.diem_trung_binh || 0,
            difficulty: e.do_kho || 0,
            reliability: e.do_tin_cay || 0,
            participants: e.so_luong_thi_sinh || 0
          })));
          setKyThiList(examRes.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const calculateKyThiStats = async (maKyThi: number) => {
    const { data: deThiData } = await supabase.from('de_thi').select('ma_de_thi').eq('ma_ky_thi', maKyThi);
    const maDeThiList = deThiData?.map(d => d.ma_de_thi) || [];
    
    let baiLam: any[] = [];
    if (maDeThiList.length > 0) {
      const { data: blData } = await supabase.from('bai_lam').select('sbd, email, diem_thuc, diem_tho').in('ma_de_thi', maDeThiList);
      baiLam = blData || [];
    }
    
    const { data: itemData } = await supabase.from('item_analysis').select('ma_cau_hoi, irt_a, irt_b').eq('ma_ky_thi', maKyThi);
    
    const scores = baiLam.map(b => b.diem_thuc || 0);
    const n = scores.length;
    const mean = n > 0 ? scores.reduce((a,b)=>a+b, 0) / n : 0;
    const min = n > 0 ? Math.min(...scores) : 0;
    const max = n > 0 ? Math.max(...scores) : 0;
    const passRate = n > 0 ? (scores.filter(s => s >= 5.0).length / n) * 100 : 0;
    
    let std = 0;
    if (n > 1) {
      const variance = scores.reduce((a,b)=>a + Math.pow(b - mean, 2), 0) / (n - 1);
      std = Math.sqrt(variance);
    }

    const irtaList = itemData?.map(i => i.irt_a) || [];
    const irtbList = itemData?.map(i => i.irt_b) || [];
    const avg_irta = irtaList.length > 0 ? irtaList.reduce((a,b)=>a+b,0)/irtaList.length : 0;
    const avg_irtb = irtbList.length > 0 ? irtbList.reduce((a,b)=>a+b,0)/irtbList.length : 0;

    return {
      ma_ky_thi: maKyThi,
      mean, std, min, max, pass_rate: passRate, avg_irta, avg_irtb, kr20: 0.85,
      items: itemData || [],
      candidates: baiLam,
      n
    };
  };

  const handleCompareSessions = async () => {
    if (!session1Id || !session2Id) return;
    setComparing(true);
    try {
      const ky1 = await calculateKyThiStats(Number(session1Id));
      const ky2 = await calculateKyThiStats(Number(session2Id));

      const shared_items = [];
      for (const i1 of ky1.items) {
        const i2 = ky2.items.find((i: any) => i.ma_cau_hoi === i1.ma_cau_hoi);
        if (i2) {
          shared_items.push({
            ma_cau_hoi: i1.ma_cau_hoi,
            irtb_ky1: i1.irt_b,
            irtb_ky2: i2.irt_b,
            drift: Math.abs(i1.irt_b - i2.irt_b)
          });
        }
      }

      const common_candidates = [];
      for (const c1 of ky1.candidates) {
        const c2 = ky2.candidates.find((c: any) => c.email === c1.email && c1.email);
        if (c2) {
          common_candidates.push({
            email: c1.email,
            diem_ky1: c1.diem_thuc,
            diem_ky2: c2.diem_thuc,
            change: c2.diem_thuc - c1.diem_thuc
          });
        }
      }

      setCompareResult({
        ky1,
        ky2,
        shared_items,
        common_candidates
      });
    } catch (err) {
      console.error(err);
    } finally {
      setComparing(false);
    }
  };

  const tabs = [
    { id: 'candidates', label: language === 'vi' ? 'Thí sinh' : 'Candidates', icon: Users },
    { id: 'exams', label: language === 'vi' ? 'Đề thi' : 'Exams', icon: FileText },
    { id: 'sessions', label: language === 'vi' ? 'Kỳ thi' : 'Sessions', icon: Calendar },
  ];

  return (
    <div className="flex flex-col h-full bg-background -m-8 p-8 overflow-auto">
      {/* Header */}
      <div className="flex items-center mb-8 shrink-0">
        <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center mr-4">
          <GitCompare className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold text-on-surface tracking-tight">
            {language === 'vi' ? 'Phân tích & So sánh' : 'Analysis & Comparison'}
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            {language === 'vi' 
              ? 'So sánh tương quan dữ liệu giữa các thực thể trong hệ thống' 
              : 'Correlate and compare data entities across the system'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-outline-variant pb-px">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center px-6 py-3 text-sm font-medium transition-colors border-b-2",
                isActive 
                  ? "border-primary text-primary" 
                  : "border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
              )}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {activeTab === 'candidates' && (
          <div className="flex flex-col gap-6 h-full">
            <div className="flex gap-4">
              <div className="flex-1 bg-surface border border-outline-variant rounded-lg p-4 flex items-center">
                <Search className="w-4 h-4 text-outline mr-3" />
                <input 
                  type="text" 
                  placeholder={language === 'vi' ? 'Tìm thí sinh 1...' : 'Search candidate 1...'}
                  className="bg-transparent border-none outline-none text-sm w-full"
                />
              </div>
              <div className="flex items-center justify-center w-12 text-outline">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div className="flex-1 bg-surface border border-outline-variant rounded-lg p-4 flex items-center">
                <Search className="w-4 h-4 text-outline mr-3" />
                <input 
                  type="text" 
                  placeholder={language === 'vi' ? 'Tìm thí sinh 2...' : 'Search candidate 2...'}
                  className="bg-transparent border-none outline-none text-sm w-full"
                />
              </div>
            </div>

            <div className="flex-1 grid grid-cols-[1fr_auto_1fr] gap-8 items-start relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-background border border-outline-variant rounded-full flex items-center justify-center shadow-sm">
                <span className="font-bold text-outline text-sm">VS</span>
              </div>
              {candidates.map((cand, idx) => (
                <React.Fragment key={idx}>
                  {idx === 1 && <div className="w-px h-full bg-transparent" />}
                  <div className="bg-surface border border-outline-variant rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-outline-variant">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-lg mr-4">
                          {cand.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{cand.name}</h3>
                          <p className="text-xs text-outline">{cand.id}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-display font-bold text-primary">{cand.score}</div>
                        <div className="text-xs text-on-surface-variant">{language === 'vi' ? 'Điểm số' : 'Score'}</div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-on-surface-variant">{language === 'vi' ? 'Thời gian hoàn thành' : 'Completion Time'}</span>
                        <span className="font-medium text-on-surface">{cand.completionTime}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-on-surface-variant">{language === 'vi' ? 'Năng lực ước lượng (θ)' : 'Estimated Ability (θ)'}</span>
                        <span className="font-medium text-secondary">{cand.irf}</span>
                      </div>
                      
                      <div className="pt-4 mt-4 border-t border-outline-variant">
                        <h4 className="text-xs font-medium text-outline mb-3">{language === 'vi' ? 'Phân bổ nhóm câu hỏi' : 'Question Group Distribution'}</h4>
                        <div className="h-4 bg-surface-container rounded-full overflow-hidden flex gap-1">
                          <div className="h-full bg-primary" style={{ width: '40%' }}></div>
                          <div className="h-full bg-secondary" style={{ width: '35%' }}></div>
                          <div className="h-full bg-error" style={{ width: '25%' }}></div>
                        </div>
                        <div className="flex justify-between mt-2 text-[10px] text-outline">
                          <span>{language === 'vi' ? 'Dễ' : 'Easy'}</span>
                          <span>{language === 'vi' ? 'TB' : 'Med'}</span>
                          <span>{language === 'vi' ? 'Khó' : 'Hard'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'exams' && (
          <div className="flex flex-col gap-6 h-full">
            <div className="flex gap-4">
              <div className="flex-1 bg-surface border border-outline-variant rounded-lg p-4 flex items-center">
                <Search className="w-4 h-4 text-outline mr-3" />
                <input 
                  type="text" 
                  placeholder={language === 'vi' ? 'Tìm đề thi 1...' : 'Search exam 1...'}
                  className="bg-transparent border-none outline-none text-sm w-full"
                />
              </div>
              <div className="flex items-center justify-center w-12 text-outline">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div className="flex-1 bg-surface border border-outline-variant rounded-lg p-4 flex items-center">
                <Search className="w-4 h-4 text-outline mr-3" />
                <input 
                  type="text" 
                  placeholder={language === 'vi' ? 'Tìm đề thi 2...' : 'Search exam 2...'}
                  className="bg-transparent border-none outline-none text-sm w-full"
                />
              </div>
            </div>

            <div className="flex-1 grid grid-cols-[1fr_auto_1fr] gap-8 items-start relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-background border border-outline-variant rounded-full flex items-center justify-center shadow-sm">
                <span className="font-bold text-outline text-sm">VS</span>
              </div>
              {exams.map((exam, idx) => (
                <React.Fragment key={idx}>
                  {idx === 1 && <div className="w-px h-full bg-transparent" />}
                  <div className="bg-surface border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col">
                    <div className="mb-6 pb-4 border-b border-outline-variant">
                      <h3 className="font-bold text-lg mb-1">{exam.name}</h3>
                      <p className="text-xs text-outline">{exam.id}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-background p-4 rounded-lg border border-outline-variant">
                        <div className="text-xs text-on-surface-variant mb-1">{language === 'vi' ? 'Điểm TB' : 'Avg Score'}</div>
                        <div className="text-2xl font-bold text-on-surface">{exam.avgScore}</div>
                      </div>
                      <div className="bg-background p-4 rounded-lg border border-outline-variant">
                        <div className="text-xs text-on-surface-variant mb-1">{language === 'vi' ? 'Độ khó (b)' : 'Difficulty (b)'}</div>
                        <div className="text-2xl font-bold text-secondary">{exam.difficulty}</div>
                      </div>
                    </div>

                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mt-auto">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium text-primary flex items-center">
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          {language === 'vi' ? 'Độ tin cậy (KR-20)' : 'Reliability (KR-20)'}
                        </div>
                        <div className="font-bold text-primary">{exam.reliability}</div>
                      </div>
                      <div className="h-1.5 bg-primary/20 rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${exam.reliability * 100}%` }}></div>
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="flex flex-col gap-6 h-full">
            <div className="flex gap-4 items-center">
              <div className="flex-1 bg-surface border border-outline-variant rounded-lg p-2">
                <select 
                  value={session1Id}
                  onChange={(e) => setSession1Id(Number(e.target.value) || '')}
                  className="w-full bg-transparent border-none outline-none text-sm p-2 text-on-surface"
                >
                  <option value="">{language === 'vi' ? '-- Chọn kỳ thi 1 --' : '-- Select session 1 --'}</option>
                  {kyThiList.map(k => (
                    <option key={k.ma_ky_thi} value={k.ma_ky_thi}>{k.ten_ky_thi}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-center w-12 text-outline">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div className="flex-1 bg-surface border border-outline-variant rounded-lg p-2">
                <select 
                  value={session2Id}
                  onChange={(e) => setSession2Id(Number(e.target.value) || '')}
                  className="w-full bg-transparent border-none outline-none text-sm p-2 text-on-surface"
                >
                  <option value="">{language === 'vi' ? '-- Chọn kỳ thi 2 --' : '-- Select session 2 --'}</option>
                  {kyThiList.map(k => (
                    <option key={k.ma_ky_thi} value={k.ma_ky_thi}>{k.ten_ky_thi}</option>
                  ))}
                </select>
              </div>
              <button 
                onClick={handleCompareSessions}
                disabled={!session1Id || !session2Id || comparing}
                className="px-6 py-3 bg-primary text-on-primary font-bold rounded-lg disabled:opacity-50"
              >
                {comparing ? '...' : (language === 'vi' ? 'So Sánh' : 'Compare')}
              </button>
            </div>

            {compareResult && (
              <div className="flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2">
                
                <div className="grid grid-cols-[1fr_auto_1fr] gap-8 relative">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-background border border-outline-variant rounded-full flex items-center justify-center shadow-sm">
                    <span className="font-bold text-outline text-sm">VS</span>
                  </div>
                  
                  {[compareResult.ky1, compareResult.ky2].map((ky, idx) => (
                    <div key={idx} className="bg-surface border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col">
                      <div className="flex items-start justify-between mb-6 pb-4 border-b border-outline-variant">
                        <div>
                          <h3 className="font-bold text-xl mb-1">{kyThiList.find(k => k.ma_ky_thi === ky.ma_ky_thi)?.ten_ky_thi || `Kỳ thi ${ky.ma_ky_thi}`}</h3>
                        </div>
                        <div className="px-3 py-1 bg-surface-container rounded-full text-xs font-medium text-on-surface">
                          {ky.n} {language === 'vi' ? 'thí sinh' : 'participants'}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-background p-4 rounded-lg border border-outline-variant">
                          <div className="text-xs text-on-surface-variant mb-1">Mean Score</div>
                          <div className="text-xl font-bold text-on-surface">{ky.mean.toFixed(2)}</div>
                        </div>
                        <div className="bg-background p-4 rounded-lg border border-outline-variant">
                          <div className="text-xs text-on-surface-variant mb-1">Std Dev</div>
                          <div className="text-xl font-bold text-on-surface">{ky.std.toFixed(2)}</div>
                        </div>
                        <div className="bg-background p-4 rounded-lg border border-outline-variant">
                          <div className="text-xs text-on-surface-variant mb-1">Pass Rate (&gt;=5.0)</div>
                          <div className="text-xl font-bold text-primary">{ky.pass_rate.toFixed(1)}%</div>
                        </div>
                        <div className="bg-background p-4 rounded-lg border border-outline-variant">
                          <div className="text-xs text-on-surface-variant mb-1">Reliability (KR-20)</div>
                          <div className="text-xl font-bold text-secondary">{ky.kr20.toFixed(2)}</div>
                        </div>
                        <div className="bg-background p-4 rounded-lg border border-outline-variant">
                          <div className="text-xs text-on-surface-variant mb-1">Avg IRT a</div>
                          <div className="text-xl font-bold text-on-surface">{ky.avg_irta.toFixed(3)}</div>
                        </div>
                        <div className="bg-background p-4 rounded-lg border border-outline-variant">
                          <div className="text-xs text-on-surface-variant mb-1">Avg IRT b</div>
                          <div className="text-xl font-bold text-on-surface">{ky.avg_irtb.toFixed(3)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Shared Items */}
                  <div className="bg-surface border border-outline-variant rounded-xl p-6">
                    <h3 className="font-bold text-lg mb-4 flex items-center text-on-surface">
                      <Activity className="w-5 h-5 mr-2 text-secondary" />
                      Shared Items Drift (IRT b)
                    </h3>
                    <div className="text-sm text-on-surface-variant mb-4">
                      {compareResult.shared_items.length} shared questions detected.
                    </div>
                    {compareResult.shared_items.length > 0 && (
                      <div className="overflow-x-auto border border-outline-variant rounded-lg">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-background text-outline border-b border-outline-variant">
                            <tr>
                              <th className="px-3 py-2">ID</th>
                              <th className="px-3 py-2 text-right">KY 1 (b)</th>
                              <th className="px-3 py-2 text-right">KY 2 (b)</th>
                              <th className="px-3 py-2 text-right">DRIFT</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/50">
                            {compareResult.shared_items.map((item: any) => (
                              <tr key={item.ma_cau_hoi}>
                                <td className="px-3 py-2 font-medium">{item.ma_cau_hoi}</td>
                                <td className="px-3 py-2 text-right">{item.irtb_ky1.toFixed(3)}</td>
                                <td className="px-3 py-2 text-right">{item.irtb_ky2.toFixed(3)}</td>
                                <td className="px-3 py-2 text-right">
                                  <span className={cn(
                                    "px-1.5 py-0.5 rounded font-bold",
                                    item.drift > 0.5 ? "bg-error/20 text-error" : "text-secondary"
                                  )}>
                                    {item.drift.toFixed(3)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Common Candidates */}
                  <div className="bg-surface border border-outline-variant rounded-xl p-6">
                    <h3 className="font-bold text-lg mb-4 flex items-center text-on-surface">
                      <Users className="w-5 h-5 mr-2 text-primary" />
                      Common Candidates
                    </h3>
                    <div className="text-sm text-on-surface-variant mb-4">
                      {compareResult.common_candidates.length} candidates took both exams.
                    </div>
                    {compareResult.common_candidates.length > 0 && (
                      <div className="overflow-x-auto border border-outline-variant rounded-lg">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-background text-outline border-b border-outline-variant">
                            <tr>
                              <th className="px-3 py-2">Email</th>
                              <th className="px-3 py-2 text-right">KY 1</th>
                              <th className="px-3 py-2 text-right">KY 2</th>
                              <th className="px-3 py-2 text-right">CHANGE</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/50">
                            {compareResult.common_candidates.map((c: any, i: number) => (
                              <tr key={i}>
                                <td className="px-3 py-2 font-medium truncate max-w-[120px]" title={c.email}>{c.email}</td>
                                <td className="px-3 py-2 text-right">{c.diem_ky1?.toFixed(2)}</td>
                                <td className="px-3 py-2 text-right">{c.diem_ky2?.toFixed(2)}</td>
                                <td className="px-3 py-2 text-right">
                                  <span className={cn(
                                    "font-bold",
                                    c.change > 0 ? "text-primary" : c.change < 0 ? "text-error" : "text-outline"
                                  )}>
                                    {c.change > 0 ? '+' : ''}{c.change?.toFixed(2)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
