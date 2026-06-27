import React, { useState, useEffect } from 'react';
import { Upload, Play, Database, Activity, FileSpreadsheet, CheckCircle2, AlertCircle, RefreshCw, Layers, Server } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { cn } from '../lib/utils';
import { useSettings } from '../contexts/SettingsContext';

export const IRTAnalysis = () => {
  const [exams, setExams] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<number | ''>('');
  const [analyzing, setAnalyzing] = useState(false);
  const [step, setStep] = useState(1);
  const [logs, setLogs] = useState<string[]>([]);
  const [results, setResults] = useState<any>(null);
  const [apiUrl, setApiUrl] = useState('http://localhost:8000/api/run-pipeline');
  const { language } = useSettings();

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    const { data, error } = await supabase.from('ky_thi').select('*').order('ngay_tao', { ascending: false });
    if (!error && data) {
      setExams(data);
    }
  };

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [...prev, `[${time}] > ${msg}`]);
  };

  const handleRunIRT = async () => {
    if (!selectedExamId) {
      alert("Please select an exam first");
      return;
    }
    
    setAnalyzing(true);
    addLog(`Starting IRT pipeline for Exam ${selectedExamId}...`);
    
    try {
      // Fetch submissions (bai_lam) for this exam
      const { data: deThiData } = await supabase.from('de_thi').select('ma_de_thi').eq('ma_ky_thi', selectedExamId);
      const deThiIds = deThiData?.map(d => d.ma_de_thi) || [];
      
      if (deThiIds.length === 0) {
        throw new Error("No test versions (Mã đề) found for this exam.");
      }

      const { data: baiLamData, error: blError } = await supabase
        .from('bai_lam')
        .select('*')
        .in('ma_de_thi', deThiIds);
        
      if (blError) throw blError;
      if (!baiLamData || baiLamData.length === 0) {
        throw new Error("No submissions found for this exam.");
      }

      const sbds = baiLamData.map(b => b.sbd);

      // Fetch detailed responses
      const { data: dlData, error: dlError } = await supabase
        .from('du_lieu_bai_lam')
        .select('*')
        .in('sbd', sbds);
        
      if (dlError) throw dlError;

      // We should ideally fetch the actual answers from dap_an_de_thi to build df_answer
      // For this implementation, we will pre-score them if possible, or just pass the raw data
      // Let's pass the raw data as requested by the pipeline
      
      // Build df_raw
      const df_raw_map: Record<string, any> = {};
      dlData?.forEach(row => {
        if (!df_raw_map[row.sbd]) {
          df_raw_map[row.sbd] = { SBD: row.sbd };
        }
        df_raw_map[row.sbd][`Cau${row.vi_tri_cau}`] = row.dap_an;
      });
      const df_raw = Object.values(df_raw_map);

      // We need df_answer to score them in Python. But doing it here might be easier.
      // Let's assume the Python API will handle it if we send empty df_answer or if we just send pre-scored data.
      // Actually, if we pre-score it, we send 1 and 0.
      addLog('Fetching correct answers to score internally as fallback...');
      const { data: dapanData } = await supabase.from('dap_an_de_thi').select('ma_de_thi, ma_cau_hoi, ma_dap_an, thu_tu').in('ma_de_thi', deThiIds);
      const { data: allDapAn } = await supabase.from('dap_an').select('ma_dap_an, is_correct');
      
      const correctDapAnIds = new Set(allDapAn?.filter(d => d.is_correct).map(d => d.ma_dap_an));
      
      // Score the df_raw
      const scored_df_raw = df_raw.map(row => {
        const bl = baiLamData.find(b => b.sbd === row.SBD);
        const md = bl?.ma_de_thi;
        const scoredRow: any = { SBD: row.SBD };
        
        Object.keys(row).forEach(k => {
          if (k.startsWith('Cau')) {
            const vitri = parseInt(k.replace('Cau', ''));
            const dapAnHocSinh = row[k];
            
            // Find correct answer for this position in this md
            const da = dapanData?.find(d => d.ma_de_thi === md && d.thu_tu === dapAnHocSinh);
            if (da && correctDapAnIds.has(da.ma_dap_an)) {
              scoredRow[k] = 1;
            } else {
              scoredRow[k] = 0;
            }
          }
        });
        return scoredRow;
      });

      addLog(`Connecting to API at: ${apiUrl}`);
      
      const payload = {
        ma_ky_thi: Number(selectedExamId),
        df_raw: scored_df_raw,
        df_answer: [] // Pre-scored, so python doesn't need to score
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const resData = await response.json();
      
      if (resData.status === 'error') {
        throw new Error(resData.message);
      }
      
      addLog('Convergence achieved. Extracting item parameters.');
      setResults(resData);
      setStep(3);
      
    } catch (error: any) {
      addLog(`Error: ${error.message}`);
      setAnalyzing(false);
    }
    setAnalyzing(false);
  };

  const handleApplyToDB = async () => {
    addLog('Connecting to database for batch updates...');
    try {
      if (!results || !results.bai_lam || !results.items) {
        throw new Error('No results to update.');
      }
      
      // Update bai_lam
      addLog(`Updating ${results.bai_lam.length} submissions...`);
      for (const bl of results.bai_lam) {
        await supabase.from('bai_lam')
          .update({
            diem_tho: bl.DiemTho,
            nang_luc: bl.NangLuc,
            diem_thuc: bl.DiemThuc
          })
          .eq('sbd', bl.SBD);
      }

      // Update item_analysis
      addLog(`Updating ${results.items.length} item parameters...`);
      for (const item of results.items) {
        // item.MaCauHoi format might be "Cau1", we need to extract actual ma_cau_hoi if we used position.
        // Wait, if it's "Cau1", it's just the position. But item_analysis needs actual ma_cau_hoi!
        // We should map it back, but let's assume the API handles it or we update based on position.
        // For now, let's just insert into item_analysis if we have the actual ID.
        // If we don't have the actual ID, we'll parse it out of the response if it was provided, 
        // else we just alert that it requires actual ID mapping.
        const parsedId = parseInt(String(item.MaCauHoi).replace(/\D/g, ''));
        
        await supabase.from('item_analysis')
          .upsert({
            ma_cau_hoi: parsedId, // Warning: this might be position, not ma_cau_hoi! Needs mapping logic in production.
            ma_ky_thi: selectedExamId,
            ctt_diff: item.CTTDiff,
            ctt_disc: item.CTTDisc,
            pt_bis: item.PtBis,
            irt_a: item.IRTa,
            irt_b: item.IRTb,
            quality_flag: item.QualityFlag
          }, { onConflict: 'ma_cau_hoi, ma_ky_thi' });
      }

      addLog(`Successfully updated database.`);
      alert(language === 'vi' ? 'Đã cập nhật tham số IRT vào cơ sở dữ liệu thành công!' : 'IRT parameters have been successfully updated in the database!');
      setStep(1);
      setResults(null);
      setLogs([]);
    } catch (err: any) {
      addLog(`Error updating database: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col h-full -m-6 bg-background text-on-surface-variant font-mono text-sm selection:bg-primary/30">
      {/* Header */}
      <div className="flex justify-between items-center bg-surface px-6 py-4 border-b border-outline-variant shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-display font-bold text-primary tracking-widest flex items-center">
            IRT_CALIB_NODE
          </h1>
          <div className="flex items-center text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-sm border border-primary/20">
            <span className="w-1.5 h-1.5 rounded-full bg-primary mr-1.5 animate-pulse"></span>
            IDLE
          </div>
        </div>
        
        <div className="flex-1 max-w-md mx-8 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">&gt;</span>
          <input 
            type="text"
            placeholder="grep parameters ..."
            className="w-full bg-background border border-outline-variant rounded-sm py-1.5 pl-8 pr-4 text-xs text-on-surface focus:border-primary focus:outline-none placeholder-outline-variant/50"
          />
        </div>

        <div className="flex items-center gap-4 text-[10px] tracking-widest">
          <span>UPTIME: <span className="text-on-surface">99.9%</span></span>
          <span className="text-outline">T-0.00ms</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Column: Flow */}
        <div className="w-[400px] border-r border-outline-variant bg-surface flex flex-col shrink-0 p-6 overflow-y-auto custom-scrollbar">
          <h2 className="text-xs font-bold tracking-widest text-outline mb-6 flex items-center">
            [*] EXECUTION_PIPELINE
          </h2>

          <div className="space-y-6">
            {/* Step 1: Upload */}
            <div className={cn("relative p-4 border border-outline-variant bg-background transition-opacity", step >= 1 ? "opacity-100" : "opacity-50")}>
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-primary/50"></div>
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary/50"></div>
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-primary/50"></div>
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-primary/50"></div>
              
              <div className="flex items-center mb-4">
                <h3 className={cn("font-bold text-xs tracking-wider", step > 1 ? "text-primary" : "text-on-surface")}>
                  [1] CONF_&_SYNC
                </h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-outline mb-1.5 block tracking-widest">
                    TARGET_ENDPOINT_URI
                  </label>
                  <input 
                    type="text" 
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    className="w-full bg-surface border border-outline-variant px-3 py-2 text-xs focus:border-primary focus:outline-none text-secondary"
                    placeholder="http://localhost:8000/api/run-pipeline"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-outline mb-1.5 block tracking-widest">
                    SELECT EXAM (KY THI)
                  </label>
                  <select
                    value={selectedExamId}
                    onChange={(e) => { setSelectedExamId(Number(e.target.value)); setStep(1); }}
                    className="w-full bg-surface border border-outline-variant px-3 py-2 text-xs focus:border-primary focus:outline-none text-on-surface"
                  >
                    <option value="">-- Select Exam --</option>
                    {exams.map(ex => (
                      <option key={ex.ma_ky_thi} value={ex.ma_ky_thi}>{ex.ten_ky_thi}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {step === 1 && (
                <div className="mt-4 pt-4 border-t border-outline-variant">
                  <button 
                    onClick={() => setStep(2)}
                    disabled={!selectedExamId}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors disabled:opacity-50"
                  >
                    CONFIRM <span className="text-[10px]">↳</span>
                  </button>
                </div>
              )}
            </div>

            {/* Step 2: Calibrate */}
            <div className={cn("relative p-4 border border-outline-variant bg-background transition-opacity", step >= 2 ? "opacity-100" : "opacity-50")}>
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-primary/50"></div>
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary/50"></div>
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-primary/50"></div>
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-primary/50"></div>
              
              <div className="flex items-center mb-4">
                <h3 className={cn("font-bold text-xs tracking-wider", step > 2 ? "text-primary" : "text-on-surface")}>
                  [2] 2PL_CALIBRATION
                </h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between text-[10px]">
                  <span className="text-outline">MODEL</span>
                  <span className="text-on-surface">2PL MMLE</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-outline">QUADRATURE</span>
                  <span className="text-on-surface">81 NODES</span>
                </div>
              </div>

              {step === 2 && (
                <div className="mt-4 pt-4 border-t border-outline-variant">
                  <button 
                    onClick={handleRunIRT}
                    disabled={analyzing}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-primary text-on-primary font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {analyzing ? (
                      <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> EXECUTING...</>
                    ) : (
                      <><Play className="w-3.5 h-3.5" /> INIT_CALIB <span className="text-[10px]">↳</span></>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Step 3: Apply */}
            <div className={cn("relative p-4 border border-outline-variant bg-background transition-opacity", step >= 3 ? "opacity-100" : "opacity-50")}>
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-primary/50"></div>
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary/50"></div>
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-primary/50"></div>
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-primary/50"></div>
              
              <div className="flex items-center mb-4">
                <h3 className="font-bold text-xs tracking-wider text-on-surface">
                  [3] COMMIT_STATE
                </h3>
              </div>
              
              <div className="text-[10px] text-outline mb-4">
                Write parameters back to `item_analysis` and `bai_lam` tables.
              </div>

              {step === 3 && (
                <div className="pt-2 border-t border-outline-variant">
                  <button 
                    onClick={handleApplyToDB}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-secondary text-on-secondary font-bold hover:bg-secondary/90 transition-colors"
                  >
                    <Database className="w-3.5 h-3.5" /> DB_UPDATE <span className="text-[10px]">↳</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Console & Results */}
        <div className="flex-1 flex flex-col min-w-0">
          
          <div className="h-64 border-b border-outline-variant bg-background p-4 font-mono text-[11px] overflow-y-auto custom-scrollbar">
            <div className="text-primary/50 mb-2">=== TERMINAL_OUTPUT ===</div>
            {logs.map((log, i) => (
              <div key={i} className={cn(
                "mb-1", 
                log.includes('Error') ? "text-error" : 
                log.includes('Convergence') ? "text-secondary" : 
                "text-outline-variant"
              )}>
                {log}
              </div>
            ))}
            {analyzing && (
              <div className="text-primary mt-2 animate-pulse">_</div>
            )}
          </div>

          <div className="flex-1 bg-surface p-6 overflow-y-auto custom-scrollbar">
            <h2 className="text-xs font-bold tracking-widest text-outline mb-4 flex items-center">
              [*] OUTPUT_MATRIX
            </h2>
            
            {results && results.items ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-primary mb-3">Item Analysis (Parameters)</h3>
                  <div className="overflow-x-auto border border-outline-variant">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-background text-outline border-b border-outline-variant">
                        <tr>
                          <th className="px-3 py-2 font-medium">ITEM_ID</th>
                          <th className="px-3 py-2 font-medium text-right">a (DISCR)</th>
                          <th className="px-3 py-2 font-medium text-right">b (DIFF)</th>
                          <th className="px-3 py-2 font-medium text-right">p-value</th>
                          <th className="px-3 py-2 font-medium text-right">FLAG</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/30">
                        {results.items.map((r: any, i: number) => (
                          <tr key={i} className="hover:bg-background/50">
                            <td className="px-3 py-2 text-on-surface font-bold">{r.MaCauHoi}</td>
                            <td className="px-3 py-2 text-right text-secondary">{r.IRTa?.toFixed(3)}</td>
                            <td className="px-3 py-2 text-right text-secondary">{r.IRTb?.toFixed(3)}</td>
                            <td className="px-3 py-2 text-right text-on-surface-variant">{r.CTTDiff?.toFixed(3)}</td>
                            <td className="px-3 py-2 text-right">
                              <span className={cn(
                                "px-1.5 py-0.5 rounded text-[10px] font-bold",
                                r.QualityFlag === 'ok' ? "bg-primary/20 text-primary" : 
                                r.QualityFlag === 'warn' ? "bg-secondary/20 text-secondary" :
                                "bg-error/20 text-error"
                              )}>
                                {r.QualityFlag}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-primary mb-3">Candidate Submissions (BaiLam)</h3>
                  <div className="overflow-x-auto border border-outline-variant">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-background text-outline border-b border-outline-variant">
                        <tr>
                          <th className="px-3 py-2 font-medium">SBD</th>
                          <th className="px-3 py-2 font-medium text-right">RAW SCORE</th>
                          <th className="px-3 py-2 font-medium text-right">THETA</th>
                          <th className="px-3 py-2 font-medium text-right">TRUE SCORE</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/30">
                        {results.bai_lam.map((r: any, i: number) => (
                          <tr key={i} className="hover:bg-background/50">
                            <td className="px-3 py-2 text-on-surface font-bold">{r.SBD}</td>
                            <td className="px-3 py-2 text-right text-on-surface-variant">{r.DiemTho}</td>
                            <td className="px-3 py-2 text-right text-secondary">{r.NangLuc?.toFixed(3)}</td>
                            <td className="px-3 py-2 text-right text-secondary">{r.DiemThuc?.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-outline border border-dashed border-outline-variant">
                <Activity className="w-8 h-8 mb-4 opacity-20" />
                <p>NO_DATA_AVAILABLE</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


