import React, { useState, useRef } from 'react';
import { XCircle, Upload, CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useSettings } from '../contexts/SettingsContext';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  examId: number;
}

export const ImportModal = ({ isOpen, onClose, examId }: ImportModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const { language } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, msg]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      addLog(`Selected file: ${e.target.files[0].name}`);
    }
  };

  const parseCSV = (text: string) => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const obj: any = {};
      headers.forEach((h, i) => {
        obj[h] = values[i];
      });
      return obj;
    });
  };

  const processImport = async () => {
    if (!file) return;
    setImporting(true);
    addLog('Starting import process...');
    
    try {
      const text = await file.text();
      const data = parseCSV(text);
      addLog(`Parsed ${data.length} rows.`);
      
      let successCount = 0;
      let errorCount = 0;

      for (const row of data) {
        if (!row.SBD || !row.Email || !row.MaDeThi) {
          addLog(`Warning: Missing required fields for row. Skipping.`);
          errorCount++;
          continue;
        }

        // 1. Ensure ThiSinh exists
        const { data: existingThiSinh, error: tsFindErr } = await supabase
          .from('thi_sinh')
          .select('email')
          .eq('email', row.Email)
          .single();
          
        if (!existingThiSinh && tsFindErr?.code === 'PGRST116') { // Not found
          addLog(`Candidate ${row.Email} not found. Creating...`);
          await supabase.from('thi_sinh').insert({
            email: row.Email,
            ho_ten: row.HoTen || 'Unknown',
            gioi: row.Gioi || 'N/A'
          });
        }

        // 2. Insert BaiLam
        addLog(`Processing BaiLam for SBD: ${row.SBD}`);
        const { error: blError } = await supabase.from('bai_lam').upsert({
          sbd: row.SBD,
          email: row.Email,
          ma_de_thi: parseInt(row.MaDeThi),
          diem_tho: 0,
          nang_luc: 0,
          diem_thuc: 0
        }, { onConflict: 'sbd' });

        if (blError) {
          addLog(`Error inserting BaiLam for SBD ${row.SBD}: ${blError.message}`);
          errorCount++;
          continue;
        }

        // 3. Insert DuLieuBaiLam
        const questionKeys = Object.keys(row).filter(k => k.match(/^Q\d+$/) || k.match(/^Cau\d+$/));
        const dlData = questionKeys.map(qKey => {
          const vitri = parseInt(qKey.replace(/\D/g, ''));
          return {
            sbd: row.SBD,
            vi_tri_cau: vitri,
            dap_an: row[qKey]
          };
        });

        if (dlData.length > 0) {
           await supabase.from('du_lieu_bai_lam').delete().eq('sbd', row.SBD); // clear old
           const { error: dlError } = await supabase.from('du_lieu_bai_lam').insert(dlData);
           if (dlError) {
             addLog(`Error inserting details for SBD ${row.SBD}: ${dlError.message}`);
             errorCount++;
             continue;
           }
        }
        
        successCount++;
      }
      
      addLog(`Import finished. Success: ${successCount}, Errors: ${errorCount}`);
    } catch (err: any) {
      addLog(`Error during import: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-outline-variant rounded-xl w-full max-w-2xl shadow-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface shrink-0">
          <h3 className="font-display font-bold text-lg text-on-surface">
            {language === 'vi' ? 'Import Bài Làm (CSV)' : 'Import Submissions (CSV)'}
          </h3>
          <button onClick={onClose} disabled={importing} className="text-outline hover:text-on-surface p-1 disabled:opacity-50">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="mb-6">
            <p className="text-sm text-on-surface-variant mb-2">
              Template: <code className="bg-background px-2 py-1 rounded text-primary">SBD, Email, HoTen, MaDeThi, Cau1, Cau2, ...</code>
            </p>
            
            <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileChange} />
            {!file ? (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-8 border-2 border-dashed border-primary/30 hover:border-primary hover:bg-primary/5 transition-all flex flex-col items-center justify-center rounded-lg"
              >
                <Upload className="w-8 h-8 text-primary mb-3" />
                <span className="font-bold text-on-surface">Click to select CSV file</span>
                <span className="text-xs text-outline mt-1">Google Forms / Sheets Export format</span>
              </button>
            ) : (
              <div className="flex items-center justify-between bg-background p-4 border border-outline-variant rounded-lg">
                <div className="flex items-center">
                  <FileSpreadsheet className="w-6 h-6 text-primary mr-3" />
                  <div>
                    <p className="text-sm font-bold text-on-surface">{file.name}</p>
                    <p className="text-xs text-outline">{Math.round(file.size / 1024)} KB</p>
                  </div>
                </div>
                {!importing && (
                  <button onClick={() => setFile(null)} className="text-error text-sm font-medium hover:underline">
                    Remove
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="bg-background border border-outline-variant rounded-lg p-3 h-48 overflow-y-auto font-mono text-xs custom-scrollbar">
            {logs.length === 0 ? (
              <span className="text-outline">Waiting for file upload...</span>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="mb-1 text-on-surface-variant">
                  {log.includes('Error') || log.includes('Warning') ? <span className="text-error">{log}</span> : log}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-4 border-t border-outline-variant flex justify-end gap-3 bg-surface shrink-0">
          <button 
            onClick={onClose}
            disabled={importing}
            className="px-4 py-2 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-50"
          >
            {language === 'vi' ? 'Đóng' : 'Close'}
          </button>
          <button 
            onClick={processImport}
            disabled={!file || importing}
            className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center"
          >
            {importing ? (
              <><Upload className="w-4 h-4 mr-2 animate-bounce" /> Processing...</>
            ) : (
              <><CheckCircle2 className="w-4 h-4 mr-2" /> Start Import</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
