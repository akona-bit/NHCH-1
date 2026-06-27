import React, { useState, useEffect } from 'react';
import { Search, User, FileText, Database, ChevronRight, GitBranch } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../supabaseClient';
import { useSettings } from '../contexts/SettingsContext';
import { DeleteModal } from '../components/DeleteModal';

export const Candidates = () => {
  const { language } = useSettings();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [itemToDelete, setItemToDelete] = useState<any | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [deleteStats, setDeleteStats] = useState({ responses: 0, loading: false });

  useEffect(() => {
    if (itemToDelete) {
      const fetchStats = async () => {
        setDeleteStats({ responses: 0, loading: true });
        let total = 0;
        const tablesToTry = ['du_lieu_bai_lam', 'chi_tiet_bai_lam', 'bai_lam', 'dap_an_thi_sinh'];
        for (const table of tablesToTry) {
          const { count } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true })
            .eq('sbd', itemToDelete.sbd);
          if (count && count > 0) {
            total = count;
            break;
          }
        }
        setDeleteStats({ responses: total, loading: false });
      };
      fetchStats();
    }
  }, [itemToDelete]);

  useEffect(() => {
    fetchCandidates();
  }, []);

  useEffect(() => {
    if (selectedCandidate) {
      fetchResponses(selectedCandidate.sbd);
    } else {
      setResponses([]);
    }
  }, [selectedCandidate]);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('thi_sinh')
        .select('*')
        .order('sbd');
      
      if (!error && data) {
        setCandidates(data);
        if (data.length > 0) {
          setSelectedCandidate(data[0]);
        }
      }
    } catch (err) {
      console.error("Error fetching candidates:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchResponses = async (sbd: string) => {
    try {
      let responseData = null;
      const tablesToTry = ['du_lieu_bai_lam', 'chi_tiet_bai_lam', 'bai_lam', 'dap_an_thi_sinh'];
      
      for (const table of tablesToTry) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq('sbd', sbd)
          .order('vi_tri_cau');
        
        if (!error && data && data.length > 0) {
          responseData = data;
          break;
        }
      }

      if (responseData) {
        setResponses(responseData);
      } else {
        setResponses([]);
      }
    } catch (err) {
      console.error("Error fetching responses:", err);
    }
  };

  const filteredCandidates = candidates.filter(c => 
    c.ho_ten?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.sbd?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleBulkDelete = async () => {
    try {
      if (selectedItems.length === 0) return;
      
      const tablesToTry = ['du_lieu_bai_lam', 'chi_tiet_bai_lam', 'bai_lam', 'dap_an_thi_sinh', 'thi_sinh_ky_thi'];
      for (const table of tablesToTry) {
        await supabase.from(table).delete().in('sbd', selectedItems);
      }
      
      const { error } = await supabase.from('thi_sinh').delete().in('sbd', selectedItems);
      if (error) throw error;
      
      setSelectedItems([]);
      setBulkDeleteConfirm(false);
      fetchCandidates();
      setSelectedCandidate(null);
    } catch (err: any) {
      console.error(err);
      alert('Error bulk deleting candidates: ' + err.message);
    }
  };

  const toggleSelection = (sbd: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedItems(prev => prev.includes(sbd) ? prev.filter(i => i !== sbd) : [...prev, sbd]);
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === filteredCandidates.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredCandidates.map(c => c.sbd));
    }
  };

  return (
    <div className="flex h-full flex-col -m-8 bg-background font-sans overflow-hidden">
      {/* Header */}
      <div className="h-16 border-b border-outline-variant bg-surface px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center text-on-surface font-bold text-lg">
          <User className="w-5 h-5 mr-2 text-primary" />
          {language === 'vi' ? 'HỒ SƠ ỨNG VIÊN & BÀI LÀM' : 'CANDIDATE PROFILES & SUBMISSIONS'}
        </div>
        {selectedItems.length > 0 && (
          <button 
            onClick={() => setBulkDeleteConfirm(true)}
            className="px-4 py-2 bg-error hover:bg-error/90 text-on-primary font-medium rounded-lg text-sm transition-colors flex items-center"
          >
            {language === 'vi' ? `Xóa (${selectedItems.length})` : `Delete (${selectedItems.length})`}
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Candidates List (Sidebar) */}
        <div className="w-80 border-r border-outline-variant bg-surface flex flex-col shrink-0">
          <div className="p-4 border-b border-outline-variant flex flex-col gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
              <input 
                className="pl-9 pr-4 py-2 w-full bg-background border border-outline-variant rounded-md text-sm text-on-surface focus:border-primary outline-none transition-colors"
                placeholder={language === 'vi' ? 'Tìm SBD, Tên...' : 'Search ID, Name...'}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <label className="flex items-center text-sm text-on-surface cursor-pointer">
              <input 
                type="checkbox" 
                className="mr-2 rounded border-outline-variant text-primary focus:ring-primary w-4 h-4"
                checked={selectedItems.length === filteredCandidates.length && filteredCandidates.length > 0}
                onChange={toggleSelectAll}
              />
              {language === 'vi' ? "Chọn tất cả" : "Select All"}
            </label>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-outline text-sm">{language === 'vi' ? 'Đang tải...' : 'Loading...'}</div>
            ) : filteredCandidates.length === 0 ? (
              <div className="p-8 text-center text-outline text-sm">{language === 'vi' ? 'Không tìm thấy thí sinh nào.' : 'No candidates found.'}</div>
            ) : (
              <div className="divide-y divide-outline-variant">
                {filteredCandidates.map((cand, idx) => (
                  <div key={idx} className="relative flex group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer"
                        checked={selectedItems.includes(cand.sbd)}
                        onChange={(e) => toggleSelection(cand.sbd, e as unknown as React.MouseEvent)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <button
                      onClick={() => setSelectedCandidate(cand)}
                      className={cn(
                        "w-full text-left py-4 pr-4 pl-10 hover:bg-surface-container transition-colors flex items-center justify-between",
                        selectedCandidate?.sbd === cand.sbd ? "bg-primary/5 border-l-2 border-primary" : "border-l-2 border-transparent",
                        selectedItems.includes(cand.sbd) && "bg-primary/5"
                      )}
                    >
                      <div>
                        <div className={cn("font-medium text-sm mb-1", selectedCandidate?.sbd === cand.sbd ? "text-primary" : "text-on-surface")}>
                          {cand.ho_ten || 'N/A'}
                        </div>
                        <div className="text-xs text-outline">{cand.sbd}</div>
                      </div>
                      <ChevronRight className={cn(
                        "w-4 h-4 transition-colors", 
                        selectedCandidate?.sbd === cand.sbd ? "text-primary" : "text-outline group-hover:text-on-surface"
                      )} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Candidate Detail & Responses */}
        <div className="flex-1 flex flex-col bg-background overflow-hidden">
          {selectedCandidate ? (
            <>
              {/* Profile Header */}
              <div className="p-6 border-b border-outline-variant bg-surface shrink-0">
                <div className="flex items-start">
                  <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xl font-bold mr-6">
                    {selectedCandidate.ho_ten ? selectedCandidate.ho_ten.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="flex-1">
                    <h2 className="text- font-display font-bold text-on-surface mb-2">{selectedCandidate.ho_ten || 'N/A'}</h2>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                      <div className="flex items-center text-on-surface-variant">
                        <span className="text-outline mr-2">{language === 'vi' ? 'SBD:' : 'ID:'}</span> 
                        <span className="font-medium text-on-surface">{selectedCandidate.sbd}</span>
                      </div>
                      <div className="flex items-center text-on-surface-variant">
                        <span className="text-outline mr-2">Email:</span> 
                        <span className="font-medium text-on-surface">{selectedCandidate.email || '-'}</span>
                      </div>
                      <div className="flex items-center text-on-surface-variant">
                        <span className="text-outline mr-2">{language === 'vi' ? 'Giới tính:' : 'Gender:'}</span> 
                        <span className="font-medium text-on-surface">{selectedCandidate.gioi_tinh || selectedCandidate.gioi || '-'}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setItemToDelete(selectedCandidate);
                    }}
                    className="p-2 text-outline hover:text-error hover:bg-error/10 rounded-lg transition-colors ml-4"
                    title={language === 'vi' ? 'Xóa' : 'Delete'}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                  </button>
                </div>
              </div>

              {/* Responses Content */}
              <div className="flex-1 p-6 overflow-auto">
                <div className="bg-surface border border-outline-variant rounded-lg overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-outline-variant bg-surface flex justify-between items-center">
                    <h3 className="font-medium text-on-surface flex items-center">
                      <FileText className="w-4 h-4 mr-2 text-secondary" />
                      {language === 'vi' ? 'Dữ liệu Bài làm' : 'Submission Data'}
                    </h3>
                    <div className="text-xs text-outline bg-background px-3 py-1 rounded-full border border-outline-variant">
                      {responses.length} {language === 'vi' ? 'câu trả lời' : 'responses'}
                    </div>
                  </div>
                  
                  {responses.length === 0 ? (
                    <div className="p-12 text-center text-outline">
                      <Database className="w-8 h-8 mx-auto mb-3 opacity-20" />
                      {language === 'vi' ? 'Không có dữ liệu bài làm cho thí sinh này.' : 'No submission data for this candidate.'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-px bg-outline-variant">
                      {responses.map((res, i) => (
                        <div key={i} className="bg-surface p-3 flex flex-col items-center justify-center aspect-square hover:bg-background transition-colors">
                          <span className="text-xs text-outline mb-1">{language === 'vi' ? 'Câu' : 'Q'}{res.vi_tri_cau || (i + 1)}</span>
                          <span className="text-lg font-bold text-on-surface">{res.dap_an || '-'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-outline p-8">
              <User className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-base">{language === 'vi' ? 'Chọn một thí sinh để xem chi tiết.' : 'Select a candidate to view details.'}</p>
            </div>
          )}
        </div>
      </div>

      {itemToDelete && (
        <DeleteModal
          isOpen={true}
          onClose={() => setItemToDelete(null)}
          onConfirm={async () => {
            try {
              // Delete child records first
              const tablesToTry = ['du_lieu_bai_lam', 'chi_tiet_bai_lam', 'bai_lam', 'dap_an_thi_sinh'];
              for (const table of tablesToTry) {
                await supabase.from(table).delete().eq('sbd', itemToDelete.sbd);
              }
              const { error } = await supabase.from('thi_sinh').delete().eq('sbd', itemToDelete.sbd);
              if (error) throw error;
              if (selectedCandidate?.sbd === itemToDelete.sbd) setSelectedCandidate(null);
              fetchCandidates();
              setItemToDelete(null);
            } catch (err) {
              console.error(err);
              alert('Error deleting candidate');
            }
          }}
          title={
            <span>
              {language === 'vi' ? 'Xóa Ứng Viên ' : 'Delete Candidate '}
              <span className="text-error">{itemToDelete.sbd}</span>
            </span>
          }
          description={
            language === 'vi' 
              ? `Hành động này sẽ xóa vĩnh viễn dữ liệu của "${itemToDelete.ho_ten || 'ứng viên'}" khỏi hệ thống.`
              : `This will permanently remove the data of "${itemToDelete.ho_ten || 'this candidate'}" from the system.`
          }
          stats={[
            { icon: <Database className="w-5 h-5" />, value: "100%", label: language === 'vi' ? "XÓA DỮ LIỆU CÁ NHÂN" : "PII PURGED" },
            { icon: <GitBranch className="w-5 h-5" />, value: deleteStats.loading ? "..." : deleteStats.responses.toString(), label: language === 'vi' ? "BẢN GHI PHẢN HỒI" : "RESPONSE RECORDS" }
          ]}
          slideText={language === 'vi' ? "KÉO ĐỂ THỰC THI XÓA" : "SLIDE TO EXECUTE PURGE"}
        />
      )}

      {bulkDeleteConfirm && (
        <DeleteModal
          isOpen={true}
          onClose={() => setBulkDeleteConfirm(false)}
          onConfirm={handleBulkDelete}
          title={language === 'vi' ? 'Xóa Nhiều Ứng Viên' : 'Bulk Delete Candidates'}
          description={
            language === 'vi' 
              ? `Bạn có chắc chắn muốn xóa vĩnh viễn ${selectedItems.length} ứng viên đã chọn? Dữ liệu bài làm của họ sẽ bị xóa.`
              : `Are you sure you want to permanently delete ${selectedItems.length} selected candidates? Their submissions will be removed.`
          }
          stats={[
            { icon: <Database className="w-5 h-5" />, value: selectedItems.length.toString(), label: language === 'vi' ? "SỐ ỨNG VIÊN" : "CANDIDATE COUNT" }
          ]}
          slideText={language === 'vi' ? "KÉO ĐỂ THỰC THI XÓA" : "SLIDE TO EXECUTE PURGE"}
        />
      )}

    </div>
  );
};
