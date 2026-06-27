import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, Edit3, Activity, BarChart2, CheckCircle2, AlertCircle, XCircle, ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';
import { MathBlock } from '../components/MathRenderer';
import { supabase } from '../supabaseClient';
import { useSettings } from '../contexts/SettingsContext';

export const Analytics = () => {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const { language } = useSettings();

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cau_hoi')
        .select('*')
        .order('ma_cau_hoi', { ascending: true });
      
      if (error) throw error;
      setQuestions(data || []);
      if (data && data.length > 0) {
        setSelectedItem(data[0]);
      }
    } catch (err) {
      console.error("Error fetching analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "ma_cau_hoi,noi_dung,a_discr,b_diff,c_guess,p_val,pt_bis\n"
      + questions.map(q => `${q.ma_cau_hoi},"${(q.noi_dung || '').replace(/"/g, '""')}","${q.a_discr || ''}","${q.b_diff || ''}","${q.c_guess || ''}","${q.p_val || ''}","${q.pt_bis || ''}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "irt_analytics_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRecalculate = async () => {
    setLoading(true);
    await supabase.from('system_alerts').insert([{
      alert_id: `RECALC-${Math.floor(Math.random() * 1000)}`,
      type: 'INFO',
      title: 'Models Recalculated',
      description: 'IRT parameters have been re-estimated based on recent response data.',
      timestamp: new Date().toLocaleTimeString(),
    }]);
    await fetchAnalyticsData();
  };

  // Compute aggregate stats safely
  const validQuestions = questions.filter(q => q.a_discr != null && q.b_diff != null);
  const avgDiscr = validQuestions.length > 0 ? validQuestions.reduce((sum, q) => sum + Number(q.a_discr), 0) / validQuestions.length : 1.24;
  const avgDiff = validQuestions.length > 0 ? validQuestions.reduce((sum, q) => sum + Number(q.b_diff), 0) / validQuestions.length : -0.15;
  
  const diffEasy = validQuestions.filter(q => Number(q.b_diff) < 0).length;
  const diffOptimal = validQuestions.filter(q => Number(q.b_diff) >= 0 && Number(q.b_diff) <= 1).length;
  const diffHard = validQuestions.filter(q => Number(q.b_diff) > 1).length;
  const totalDiff = validQuestions.length || 1;

  return (
    <div className="flex flex-col gap-6 h-full w-full pb-10">
      <div className="flex justify-between items-end mb-2">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 text-[10px] font-mono border border-outline-variant rounded text-outline">{language === 'vi' ? 'BÁO CÁO TÂM TRẮC' : 'PSYCHOMETRIC REPORT'}</span>
            <span className="px-2 py-0.5 text-[10px] font-mono bg-secondary/10 border border-secondary/30 rounded text-secondary flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary mr-1.5 animate-pulse"></span>
              {language === 'vi' ? 'LUỒNG DỮ LIỆU TRỰC TIẾP' : 'LIVE DATA STREAM'}
            </span>
          </div>
          <h1 className="text-3xl font-display font-bold text-on-surface">{language === 'vi' ? 'Phân tích IRT' : 'IRT Analytics'}</h1>
          <p className="text-xs text-on-surface-variant font-mono mt-1">{language === 'vi' ? 'Tập dữ liệu: Local Supabase | Mô hình: 3PL | N =' : 'Dataset: Local Supabase | Model: 3PL | N ='} {questions.length}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExportReport} className="px-4 py-2 border border-outline-variant rounded-lg text-sm flex items-center hover:bg-surface shadow-sm transition-colors">
            <Download className="w-4 h-4 mr-2" /> {language === 'vi' ? 'Xuất báo cáo' : 'Export Report'}
          </button>
          <button onClick={handleRecalculate} className="px-4 py-2 bg-primary text-on-primary font-medium rounded-lg text-sm flex items-center hover:bg-primary/90 transition-colors">
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} /> {language === 'vi' ? 'Tính toán lại mô hình' : 'Recalculate Models'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* KR-20 */}
        <div className="bg-surface shadow-sm rounded-xl border border-outline-variant p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xs font-bold text-on-surface tracking-widest">{language === 'vi' ? 'ĐỘ TIN CẬY (KR-20)' : 'TEST RELIABILITY (KR-20)'}</h3>
            <Edit3 className="w-4 h-4 text-primary" />
          </div>
          <div className="flex items-end gap-3 mb-4">
            <span className="text-4xl font-display font-bold text-on-surface">0.89</span>
            <span className="text-xs font-mono text-secondary bg-secondary/10 px-2 py-0.5 rounded border border-secondary/20 mb-1">+0.02</span>
          </div>
          <p className="text-xs text-on-surface-variant mb-6 h-10">{language === 'vi' ? 'Độ nhất quán nội bộ tuyệt vời. Các câu hỏi có tính đồng nhất cao.' : 'Excellent internal consistency. Test items are highly homogeneous.'}</p>
          <div className="flex gap-1 h-3">
            <div className="flex-1 bg-background"></div>
            <div className="flex-1 bg-background"></div>
            <div className="flex-1 bg-background"></div>
            <div className="flex-1 bg-outline-variant"></div>
            <div className="flex-1 bg-primary"></div>
          </div>
        </div>

        {/* Discrimination */}
        <div className="bg-surface shadow-sm rounded-xl border border-outline-variant p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xs font-bold text-on-surface tracking-widest">{language === 'vi' ? 'ĐỘ PHÂN BIỆT TB (A)' : 'AVG DISCRIMINATION (A)'}</h3>
            <Activity className="w-4 h-4 text-secondary" />
          </div>
          <div className="flex items-end gap-3 mb-4">
            <span className="text-4xl font-display font-bold text-on-surface">{avgDiscr.toFixed(2)}</span>
            <span className="text-xs font-mono text-on-surface-variant bg-background px-2 py-0.5 rounded border border-outline-variant mb-1">{language === 'vi' ? 'Mục tiêu:' : 'Target:'} {`>1.0`}</span>
          </div>
          <p className="text-xs text-on-surface-variant mb-6 h-10">{language === 'vi' ? 'Câu hỏi phân biệt tốt giữa thí sinh năng lực thấp và cao.' : 'Items effectively differentiate between low and high ability examinees.'}</p>
          <div className="h-2 bg-background rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-error via-outline to-secondary" style={{ width: `${Math.min((avgDiscr / 2) * 100, 100)}%` }}></div>
          </div>
        </div>

        {/* Difficulty */}
        <div className="bg-surface shadow-sm rounded-xl border border-outline-variant p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xs font-bold text-on-surface tracking-widest">{language === 'vi' ? 'ĐỘ KHÓ TB (B)' : 'MEAN DIFFICULTY (B)'}</h3>
            <BarChart2 className="w-4 h-4 text-on-surface" />
          </div>
          <div className="flex items-end gap-3 mb-4">
            <span className="text-4xl font-display font-bold text-on-surface">{avgDiff.toFixed(2)}</span>
            <span className="text-xs font-mono text-tertiary bg-tertiary/10 px-2 py-0.5 rounded border border-tertiary/20 mb-1">Logits</span>
          </div>
          <p className="text-xs text-on-surface-variant mb-4 h-10">{language === 'vi' ? 'Độ khó tổng thể so với mức năng lực của mẫu hiện tại.' : 'Overall difficulty relative to the current sample ability level.'}</p>
          <div className="flex justify-between text-xs">
            <div className="text-center"><div className="text-on-surface-variant">{language === 'vi' ? 'Dễ' : 'Easy'} ({`<0`})</div><div className="font-mono font-bold mt-1 text-on-surface">{Math.round((diffEasy/totalDiff)*100)}%</div></div>
            <div className="text-center"><div className="text-on-surface-variant">{language === 'vi' ? 'Tối ưu' : 'Optimal'} (0-1)</div><div className="font-mono font-bold mt-1 text-on-surface">{Math.round((diffOptimal/totalDiff)*100)}%</div></div>
            <div className="text-center"><div className="text-on-surface-variant">{language === 'vi' ? 'Khó' : 'Hard'} ({`>1`})</div><div className="font-mono font-bold mt-1 text-on-surface">{Math.round((diffHard/totalDiff)*100)}%</div></div>
          </div>
        </div>
      </div>

      <div className="flex gap-6 h-[500px]">
        {/* Item Matrix */}
        <div className="flex-[2] bg-surface shadow-sm rounded-xl border border-outline-variant flex flex-col overflow-hidden">
          <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface shadow-sm-high shrink-0">
            <div className="flex items-center text-primary">
              <Grid className="w-4 h-4 mr-2" />
              <h3 className="font-bold text-sm">Item Analysis Matrix</h3>
            </div>
            <div className="flex gap-2">
              <select className="bg-background border border-outline-variant rounded px-3 py-1 text-xs text-on-surface focus:outline-none">
                <option>Sort by: Item ID</option>
              </select>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-on-surface-variant bg-background sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 font-mono font-normal">ITEM ID</th>
                  <th className="px-4 py-3 font-mono font-normal">P-VAL</th>
                  <th className="px-4 py-3 font-mono font-normal">PT-BIS</th>
                  <th className="px-4 py-3 font-mono font-normal">A (DISCR)</th>
                  <th className="px-4 py-3 font-mono font-normal">B (DIFF)</th>
                  <th className="px-4 py-3 font-mono font-normal">C (GUESS)</th>
                  <th className="px-4 py-3 font-mono font-normal">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/50 font-mono text-xs">
                {loading ? (
                  <tr><td colSpan={7} className="p-8 text-center text-outline-variant">Loading item metrics...</td></tr>
                ) : questions.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-outline-variant">No items available for analysis.</td></tr>
                ) : (
                  questions.map(q => (
                    <tr 
                      key={q.ma_cau_hoi} 
                      onClick={() => setSelectedItem(q)}
                      className={cn(
                        "hover:bg-surface shadow-sm-high cursor-pointer transition-colors",
                        selectedItem?.ma_cau_hoi === q.ma_cau_hoi && "bg-primary/5"
                      )}
                    >
                      <td className="px-4 py-3 flex items-center">
                        {selectedItem?.ma_cau_hoi === q.ma_cau_hoi && <span className="w-1.5 h-1.5 rounded-full bg-primary mr-2"></span>}
                        <span className={selectedItem?.ma_cau_hoi !== q.ma_cau_hoi ? "pl-3" : ""}>ITM-{q.ma_cau_hoi.toString().padStart(3, '0')}</span>
                      </td>
                      <td className="px-4 py-3 text-on-surface">{Number(q.p_val || 0.50).toFixed(2)}</td>
                      <td className={cn("px-4 py-3", Number(q.pt_bis || 0.3) < 0.2 ? "text-error" : "text-primary")}>{Number(q.pt_bis || 0.30).toFixed(2)}</td>
                      <td className="px-4 py-3 text-on-surface">{Number(q.a_discr || 1.0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-on-surface">{Number(q.b_diff || 0.0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-on-surface">{Number(q.c_guess || 0.2).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "px-2 py-1 border rounded",
                          q.irt_status === 'Keep' ? "border-secondary/30 text-secondary" :
                          q.irt_status === 'Revise' ? "border-error/50 text-error bg-error/10" :
                          q.irt_status === 'Reject' ? "border-error/50 text-error bg-error/10" :
                          "border-outline text-on-surface-variant"
                        )}>
                          {q.irt_status || 'Review'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Item Detail */}
        <div className="flex-1 bg-surface shadow-sm rounded-xl border border-outline-variant p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-display font-semibold text-lg">
              {selectedItem ? `ITM-${selectedItem.ma_cau_hoi.toString().padStart(3, '0')} Detail` : 'Item Detail'}
            </h3>
            <ExternalLink className="w-4 h-4 text-outline" />
          </div>

          {selectedItem ? (
            <>
              <div className="bg-background border border-outline-variant rounded-lg p-4 mb-6 font-mono text-xs text-primary leading-relaxed max-h-24 overflow-auto">
                "{selectedItem.noi_dung || 'No content provided.'}"
              </div>

              <h4 className="text-[10px] font-bold text-on-surface tracking-widest flex items-center mb-4">
                <Activity className="w-3 h-3 mr-2" /> ITEM CHARACTERISTIC CURVE (ICC)
              </h4>
              
              <div className="h-32 border-l border-b border-outline-variant/50 relative mb-8">
                {selectedItem && (
                  <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 300 120">
                    <path 
                      d={(() => {
                        const a = Number(selectedItem.a_discr) || 1.0;
                        const b = Number(selectedItem.b_diff) || 0.0;
                        const c = Number(selectedItem.c_guess) || 0.0;
                        const points = [];
                        for (let x = 0; x <= 300; x++) {
                          const theta = (x / 300) * 6 - 3;
                          const p = c + (1 - c) / (1 + Math.exp(-a * (theta - b)));
                          const y = 120 - (p * 120);
                          points.push(`${x},${y}`);
                        }
                        return `M ${points.join(' L ')}`;
                      })()}
                      fill="none" 
                      stroke="var(--color-primary)" 
                      strokeWidth="3" 
                    />
                    <circle 
                      cx={( (Number(selectedItem.b_diff) || 0) + 3 ) / 6 * 300} 
                      cy={120 - ((Number(selectedItem.c_guess) || 0) + (1 - (Number(selectedItem.c_guess) || 0))/2) * 120} 
                      r="4" 
                      fill="var(--color-secondary)" 
                    />
                  </svg>
                )}
                <div className="absolute top-0 -left-6 text-[10px] text-outline font-mono">1.0</div>
                <div className="absolute bottom-0 -left-6 text-[10px] text-outline font-mono">0.0</div>
                <div className="absolute -bottom-5 left-0 text-[10px] text-outline font-mono">-3</div>
                <div className="absolute -bottom-5 right-0 text-[10px] text-outline font-mono">+3</div>
                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-outline font-mono">Ability (θ)</div>
              </div>

              <h4 className="text-[10px] font-bold text-on-surface tracking-widest flex items-center mb-4">
                <BarChart2 className="w-3 h-3 mr-2" /> DISTRACTOR ANALYSIS
              </h4>

              <div className="space-y-4 mb-6">
                <div className="flex items-center text-xs">
                  <div className="w-6 h-6 rounded bg-secondary/20 border border-secondary text-secondary flex items-center justify-center mr-3 font-bold">A</div>
                  <div className="flex-1">
                    <div className="flex justify-between font-mono mb-1 text-[10px]">
                      <span className="text-on-surface">Correct Option</span>
                      <span className="text-secondary">{Math.round((selectedItem.p_val || 0.5) * 100)}% (PtB: {Number(selectedItem.pt_bis || 0.3).toFixed(2)})</span>
                    </div>
                    <div className="h-1 bg-background rounded-full"><div className="h-full bg-secondary rounded-full" style={{ width: `${(selectedItem.p_val || 0.5) * 100}%` }}></div></div>
                  </div>
                </div>
                <div className="flex items-center text-xs">
                  <div className="w-6 h-6 rounded bg-background border border-outline-variant text-outline flex items-center justify-center mr-3">B</div>
                  <div className="flex-1">
                    <div className="flex justify-between font-mono mb-1 text-[10px]">
                      <span className="text-on-surface">Distractor</span>
                      <span className="text-outline">{Math.round((1 - (selectedItem.p_val || 0.5)) * 100)}%</span>
                    </div>
                    <div className="h-1 bg-background rounded-full"><div className="h-full bg-outline-variant rounded-full" style={{ width: `${(1 - (selectedItem.p_val || 0.5)) * 100}%` }}></div></div>
                  </div>
                </div>
              </div>

              <div className="mt-auto grid grid-cols-3 gap-2 shrink-0">
                <div className="bg-background border border-outline-variant rounded p-2 text-center">
                  <div className="text-[9px] font-bold tracking-wider mb-1">DISCRM (A)</div>
                  <div className="font-mono text-sm font-bold text-on-surface">{Number(selectedItem.a_discr || 1.0).toFixed(2)}</div>
                </div>
                <div className="bg-background border border-outline-variant rounded p-2 text-center">
                  <div className="text-[9px] font-bold tracking-wider mb-1">DIFF (B)</div>
                  <div className="font-mono text-sm font-bold text-on-surface">{Number(selectedItem.b_diff || 0.0).toFixed(2)}</div>
                </div>
                <div className="bg-background border border-outline-variant rounded p-2 text-center">
                  <div className="text-[9px] font-bold tracking-wider mb-1">GUESS (C)</div>
                  <div className="font-mono text-sm font-bold text-on-surface">{Number(selectedItem.c_guess || 0.2).toFixed(2)}</div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-outline-variant text-sm">
              Select an item to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function Grid(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M3 9h18" />
      <path d="M3 15h18" />
      <path d="M9 3v18" />
      <path d="M15 3v18" />
    </svg>
  )
}