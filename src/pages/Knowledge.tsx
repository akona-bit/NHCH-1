import React, { useState, useEffect } from 'react';
import { Plus, Filter, Save, AlertCircle, Trash2, Link2Off, Database, GitBranch, Edit2, MoveRight, ChevronRight, Folder } from 'lucide-react';
import { MathRenderer } from '../components/MathRenderer';
import { supabase } from '../supabaseClient';
import { useSettings } from '../contexts/SettingsContext';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { DeleteModal } from '../components/DeleteModal';
import { KnowledgeTree } from '../components/KnowledgeTree';
import { cn } from '../lib/utils';

import { syncKnowledgeTree, flattenKnowledgeTree, KnowledgeTreeNode, KnowledgeNode } from '../services/knowledgeService';

export const Knowledge = () => {
  const [treeNodes, setTreeNodes] = useState<KnowledgeTreeNode[]>([]);
  const [flatNodes, setFlatNodes] = useState<KnowledgeNode[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selection State
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const selectedNode = flatNodes.find(n => n.ma_kien_thuc === selectedNodeId) || null;

  // View States: 'view', 'edit', 'create'
  const [viewState, setViewState] = useState<'view' | 'edit' | 'create'>('view');
  
  // Form State
  const [nodeName, setNodeName] = useState('');
  const [nodeCode, setNodeCode] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { language } = useSettings();

  // Statistics State
  const [stats, setStats] = useState({ questions: 0, exams: 0, subNodes: 0 });
  const [recentQuestions, setRecentQuestions] = useState<any[]>([]);

  useEffect(() => {
    fetchNodes();
  }, []);

  useEffect(() => {
    if (selectedNode && viewState === 'view') {
      // Fetch stats when node selected
      fetchNodeStats(selectedNode.ma_kien_thuc);
    }
  }, [selectedNode, viewState]);

  const fetchNodes = async () => {
    try {
      const data = await syncKnowledgeTree();
      setTreeNodes(data);
      setFlatNodes(flattenKnowledgeTree(data));
    } catch (err: any) {
      console.error('Error fetching nodes:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNodeStats = async (nodeId: string) => {
    const subNodesCount = flatNodes.filter(n => n.ma_kt_parent === nodeId).length;
    
    // Fetch count of questions linked to this node
    const { count: questionsCount } = await supabase
      .from('kien_thuc_cau_hoi')
      .select('*', { count: 'exact', head: true })
      .eq('ma_kien_thuc', nodeId);

    // Fetch recent questions
    const { data: recentQs } = await supabase
      .from('kien_thuc_cau_hoi')
      .select(`
        cau_hoi (
          ma_cau_hoi,
          noi_dung,
          tinh_trang
        )
      `)
      .eq('ma_kien_thuc', nodeId)
      .limit(5);

    setStats({
      questions: questionsCount || 0,
      exams: 0, // Mock for now, would need a complex join through ky_thi_cau_hoi
      subNodes: subNodesCount
    });

    setRecentQuestions(recentQs?.map(r => r.cau_hoi) || []);
  };

  const handleStartCreate = () => {
    setViewState('create');
    setNodeCode('');
    setNodeName('');
    setDescription('');
    // If a node is selected, default to making it the parent
    setParentId(selectedNodeId);
    setError(null);
  };

  const handleStartEdit = () => {
    if (!selectedNode) return;
    setViewState('edit');
    setNodeCode(selectedNode.ma_kien_thuc);
    setNodeName(selectedNode.ten_kien_thuc);
    setDescription(selectedNode.mo_ta || '');
    setParentId(selectedNode.ma_kt_parent);
    setError(null);
  };

  const handleCancelForm = () => {
    setViewState('view');
    setError(null);
  };

  const handleSave = async () => {
    if (!nodeName || !nodeCode) {
      setError("Name and Code are required");
      return;
    }
    setSaving(true);
    setError(null);
    
    try {
      const { data: user } = await supabase.auth.getUser();
      const userId = user?.user?.id;

      if (viewState === 'create') {
        const { error } = await supabase.from('kien_thuc').insert({
          ma_kien_thuc: nodeCode,
          ten_kien_thuc: nodeName,
          mo_ta: description,
          ma_kt_parent: parentId,
          nguoi_tao: userId
        });
        if (error) throw error;
      } else if (viewState === 'edit') {
        const { error } = await supabase.from('kien_thuc')
          .update({
            ten_kien_thuc: nodeName,
            mo_ta: description,
            ma_kt_parent: parentId
          })
          .eq('ma_kien_thuc', nodeCode);
        if (error) throw error;
      }
      
      await fetchNodes();
      setViewState('view');
      setSelectedNodeId(nodeCode); // Select the newly created or edited node
    } catch (err: any) {
      setError(err.message || 'An error occurred saving the node.');
    } finally {
      setSaving(false);
    }
  };

  const [itemToDelete, setItemToDelete] = useState<KnowledgeNode | null>(null);
  const [deleteStats, setDeleteStats] = useState({ questions: 0, loading: false });

  useEffect(() => {
    if (itemToDelete) {
      const fetchDelStats = async () => {
        setDeleteStats({ questions: 0, loading: true });
        const { count } = await supabase
          .from("kien_thuc_cau_hoi")
          .select("*", { count: "exact", head: true })
          .eq("ma_kien_thuc", itemToDelete.ma_kien_thuc);
        setDeleteStats({ questions: count || 0, loading: false });
      };
      fetchDelStats();
    }
  }, [itemToDelete]);

  const deleteRecursive = async (nodeId: string) => {
    const { data: children } = await supabase
      .from('kien_thuc')
      .select('ma_kien_thuc')
      .eq('ma_kt_parent', nodeId);
      
    if (children && children.length > 0) {
      for (const child of children) {
        await deleteRecursive(child.ma_kien_thuc);
      }
    }
    
    await supabase.from('kien_thuc_cau_hoi').delete().eq('ma_kien_thuc', nodeId);
    const { error } = await supabase.from('kien_thuc').delete().eq('ma_kien_thuc', nodeId);
    if (error) throw error;
  };

  const handleDeleteNode = async (ma_kien_thuc: string) => {
    setDeleting(true);
    try {
      await deleteRecursive(ma_kien_thuc);
      if (selectedNodeId === ma_kien_thuc) setSelectedNodeId(null);
      await fetchNodes();
      setViewState('view');
    } catch (err: any) {
      setError(err.message || 'An error occurred deleting the node.');
    } finally {
      setDeleting(false);
      setItemToDelete(null);
    }
  };

  const getBreadcrumbs = (nodeId: string): KnowledgeNode[] => {
    const path: KnowledgeNode[] = [];
    let current = flatNodes.find(n => n.ma_kien_thuc === nodeId);
    while (current) {
      path.unshift(current);
      current = flatNodes.find(n => n.ma_kien_thuc === current?.ma_kt_parent);
    }
    return path;
  };

  return (
    <div className="flex flex-col h-full -m-8 bg-background relative">
      <LoadingOverlay 
        isLoading={saving || deleting} 
        message={
          saving ? (language === 'vi' ? 'Đang lưu...' : 'Saving...') :
          deleting ? (language === 'vi' ? 'Đang xóa...' : 'Deleting...') :
          (language === 'vi' ? 'Đang tải...' : 'Loading...')
        }
      />
      
      {/* Header */}
      <div className="flex justify-between items-center bg-surface px-8 py-6 border-b border-outline-variant shrink-0">
        <div>
          <h1 className="text-3xl font-display font-bold text-on-surface tracking-tight mb-2">
            {language === 'vi' ? 'Cây Kiến Thức' : 'Knowledge Tree'}
          </h1>
          <p className="text-sm text-on-surface-variant">
            {language === 'vi' ? 'Tổ chức phân cấp các miền tri thức và gắn thẻ câu hỏi.' : 'Hierarchical organization of curriculum domains and question tags.'}
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleStartCreate}
            className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            {language === 'vi' ? 'Thêm Nút Mới' : 'Add New Node'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar Tree */}
        <div className="w-80 border-r border-outline-variant bg-surface flex flex-col shrink-0 relative z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
          {loading ? (
             <div className="p-8 text-center text-outline text-sm font-mono">Loading tree...</div>
          ) : (
            <KnowledgeTree 
              nodes={treeNodes} 
              selectedNodeId={selectedNodeId} 
              onSelectNode={(id) => {
                setSelectedNodeId(id);
                if (viewState !== 'view') setViewState('view');
              }} 
            />
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-background p-8">
          {viewState === 'view' ? (
            selectedNode ? (
              <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Breadcrumbs */}
                <div className="flex items-center text-sm text-outline font-medium mb-6">
                  {getBreadcrumbs(selectedNode.ma_kien_thuc).map((crumb, idx, arr) => (
                    <React.Fragment key={crumb.ma_kien_thuc}>
                      <span className={cn("transition-colors", idx === arr.length - 1 ? "text-primary" : "text-on-surface-variant hover:text-on-surface cursor-pointer")}
                            onClick={() => setSelectedNodeId(crumb.ma_kien_thuc)}>
                        {crumb.ten_kien_thuc}
                      </span>
                      {idx < arr.length - 1 && <ChevronRight className="w-4 h-4 mx-2" />}
                    </React.Fragment>
                  ))}
                </div>

                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-4xl font-display font-bold text-on-surface tracking-tight mb-4">{selectedNode.ten_kien_thuc}</h2>
                    <div className="flex gap-3 text-xs font-mono font-bold uppercase tracking-widest">
                      <span className="bg-surface border border-outline-variant px-3 py-1.5 rounded flex items-center text-outline">
                        <span className="w-1.5 h-1.5 rounded-full bg-outline-variant mr-2" />
                        ID: {selectedNode.ma_kien_thuc}
                      </span>
                      {/* Can add tags or other metadata here */}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleStartEdit}
                      className="p-2.5 text-outline hover:text-primary hover:bg-primary/10 rounded-lg border border-outline-variant hover:border-primary/50 transition-all bg-surface"
                      title={language === 'vi' ? 'Chỉnh sửa' : 'Edit'}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setItemToDelete(selectedNode)}
                      className="p-2.5 text-outline hover:text-error hover:bg-error/10 rounded-lg border border-outline-variant hover:border-error/50 transition-all bg-surface"
                      title={language === 'vi' ? 'Xóa' : 'Delete'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Description Box */}
                <div className="mb-10">
                  <h3 className="text-lg font-bold text-on-surface mb-4 border-b border-outline-variant/50 pb-2">{language === 'vi' ? 'Mô tả' : 'Description'}</h3>
                  <div className="text-on-surface-variant leading-relaxed text-sm">
                    {selectedNode.mo_ta ? (
                      <MathRenderer content={selectedNode.mo_ta} />
                    ) : (
                      <span className="italic text-outline">{language === 'vi' ? 'Không có mô tả.' : 'No description provided.'}</span>
                    )}
                  </div>
                </div>

                {/* Statistics Grid */}
                <div className="mb-10">
                  <h3 className="text-lg font-bold text-on-surface mb-4 border-b border-outline-variant/50 pb-2">{language === 'vi' ? 'Thống kê Nút' : 'Node Statistics'}</h3>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="bg-surface border border-outline-variant rounded-xl p-5">
                      <div className="text-xs text-on-surface-variant mb-2">{language === 'vi' ? 'Tổng Câu Hỏi' : 'Total Questions'}</div>
                      <div className="text-3xl font-display font-bold text-on-surface">{stats.questions.toLocaleString()}</div>
                    </div>
                    <div className="bg-surface border border-outline-variant rounded-xl p-5">
                      <div className="text-xs text-on-surface-variant mb-2">{language === 'vi' ? 'Kỳ Thi Hoạt Động' : 'Active Exams'}</div>
                      <div className="text-3xl font-display font-bold text-on-surface">{stats.exams.toLocaleString()}</div>
                    </div>
                    <div className="bg-surface border border-outline-variant rounded-xl p-5">
                      <div className="text-xs text-on-surface-variant mb-2">{language === 'vi' ? 'Nút Con' : 'Sub-nodes'}</div>
                      <div className="text-3xl font-display font-bold text-on-surface">{stats.subNodes.toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                {/* Recent Linked Questions */}
                <div>
                  <div className="flex justify-between items-end mb-4 border-b border-outline-variant/50 pb-2">
                    <h3 className="text-lg font-bold text-on-surface">{language === 'vi' ? 'Câu hỏi liên kết gần đây' : 'Recent Linked Questions'}</h3>
                    <span className="text-sm font-medium text-primary hover:underline cursor-pointer">
                      {language === 'vi' ? 'Xem tất cả' : 'View All in Bank'}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {recentQuestions.length > 0 ? (
                      recentQuestions.map((q: any) => (
                        <div key={q.ma_cau_hoi} className="bg-surface border border-outline-variant rounded-xl p-4 flex justify-between items-center hover:border-primary/50 cursor-pointer transition-colors group">
                          <div>
                            <div className="text-sm font-medium text-on-surface mb-1 group-hover:text-primary transition-colors line-clamp-1">
                              <MathRenderer content={q.noi_dung || ''} />
                            </div>
                            <div className="text-xs font-mono text-outline uppercase tracking-wider">
                              ID: Q-{q.ma_cau_hoi?.toString().substring(0,4)} • {q.tinh_trang}
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-outline group-hover:text-primary transition-colors" />
                        </div>
                      ))
                    ) : (
                      <div className="text-center p-8 bg-surface rounded-xl border border-outline-variant border-dashed text-outline text-sm">
                        {language === 'vi' ? 'Chưa có câu hỏi nào được gắn thẻ nút này.' : 'No questions linked to this node yet.'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-outline animate-in fade-in duration-500">
                <Folder className="w-16 h-16 mb-4 opacity-50" />
                <h3 className="text-xl font-display text-on-surface mb-2">{language === 'vi' ? 'Chưa chọn Nút' : 'No Node Selected'}</h3>
                <p className="text-sm text-center max-w-md">
                  {language === 'vi' 
                    ? 'Chọn một nút từ cây kiến thức bên trái để xem chi tiết, thống kê và quản lý liên kết.'
                    : 'Select a node from the knowledge tree on the left to view details, statistics, and manage links.'}
                </p>
              </div>
            )
          ) : (
            // Create / Edit Form
            <div className="max-w-3xl mx-auto bg-surface shadow-sm rounded-xl border border-outline-variant p-8 animate-in slide-in-from-bottom-4 fade-in duration-500">
              <div className="mb-8 border-b border-outline-variant/50 pb-6">
                <h2 className="font-display font-semibold text-2xl text-on-surface mb-2">
                  {viewState === 'create' 
                    ? (language === 'vi' ? 'Tạo nút kiến thức' : 'Create Knowledge Node')
                    : (language === 'vi' ? 'Chỉnh sửa nút' : 'Edit Knowledge Node')}
                </h2>
                <p className="text-sm text-on-surface-variant">
                  {language === 'vi' ? 'Cấu hình chi tiết cho miền tri thức này.' : 'Configure details for this knowledge domain.'}
                </p>
              </div>

              {error && (
                <div className="mb-6 flex items-start bg-error/10 border border-error/20 rounded-lg p-4 text-error text-sm font-mono">
                  <AlertCircle className="w-5 h-5 mr-3 mt-0.5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-2">{language === 'vi' ? 'Tên nút' : 'Node Name'} <span className="text-error">*</span></label>
                    <input 
                      type="text" 
                      value={nodeName}
                      onChange={e => setNodeName(e.target.value)}
                      placeholder="e.g. Quantum Mechanics" 
                      className="w-full bg-background border border-outline-variant rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 text-on-surface transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-2">{language === 'vi' ? 'Mã kiến thức (ID)' : 'Knowledge Code (ID)'} <span className="text-error">*</span></label>
                    <input 
                      type="text" 
                      value={nodeCode}
                      onChange={e => setNodeCode(e.target.value)}
                      disabled={viewState === 'edit'}
                      placeholder="e.g. DOM-PHYS-QM" 
                      className="w-full bg-background border border-outline-variant rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 text-primary font-mono transition-all disabled:opacity-50" 
                    />
                    {viewState === 'edit' && <p className="text-xs text-outline mt-1 font-mono">ID cannot be changed after creation.</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-on-surface mb-2">{language === 'vi' ? 'Nút cha' : 'Parent Node'}</label>
                  <select
                    value={parentId || ''}
                    onChange={(e) => setParentId(e.target.value === '' ? null : e.target.value)}
                    className="w-full bg-background border border-outline-variant rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary text-on-surface transition-all appearance-none"
                  >
                    <option value="">{language === 'vi' ? '-- Gốc (Không có cha) --' : '-- Root Level (None) --'}</option>
                    {flatNodes.filter(n => n.ma_kien_thuc !== nodeCode).map(n => (
                      <option key={n.ma_kien_thuc} value={n.ma_kien_thuc}>{n.ten_kien_thuc} ({n.ma_kien_thuc})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-on-surface mb-2">{language === 'vi' ? 'Mô tả' : 'Description'} <span className="text-xs text-outline font-normal ml-2">(Markdown & LaTeX supported)</span></label>
                  <textarea 
                    className="w-full min-h-[200px] bg-background border border-outline-variant rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 text-on-surface transition-all font-mono resize-y"
                    placeholder="Enter detailed description of the knowledge node here..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  ></textarea>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-outline-variant/50">
                <button 
                  onClick={handleCancelForm}
                  className="px-6 py-2.5 rounded-lg text-sm font-medium border border-outline-variant hover:bg-surface-bright transition-colors text-on-surface-variant"
                >
                  {language === 'vi' ? 'Hủy' : 'Cancel'}
                </button>
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="px-8 py-2.5 rounded-lg text-sm font-bold bg-primary text-on-primary hover:bg-primary/90 transition-colors flex items-center disabled:opacity-50"
                >
                  {saving ? (language === 'vi' ? 'Đang lưu...' : 'Saving...') : (language === 'vi' ? 'Lưu' : 'Save Node')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {itemToDelete && (
        <DeleteModal
          isOpen={true}
          onClose={() => setItemToDelete(null)}
          onConfirm={() => handleDeleteNode(itemToDelete.ma_kien_thuc)}
          title={
            <span>
              {language === 'vi' ? 'Xóa Node ' : 'Delete Node '}
              <span className="text-error">{itemToDelete.ma_kien_thuc}</span>
            </span>
          }
          description={
            language === 'vi' 
              ? `Hành động này sẽ xóa vĩnh viễn "${itemToDelete.ten_kien_thuc}" và TẤT CẢ các nút con khỏi cấu trúc liên kết kiến thức.`
              : `This will permanently remove "${itemToDelete.ten_kien_thuc}" and ALL child nodes from the knowledge topology.`
          }
          stats={[
            { icon: <Link2Off className="w-5 h-5" />, value: deleteStats.loading ? "..." : deleteStats.questions.toString(), label: language === 'vi' ? "CÂU HỎI MỒ CÔI" : "ORPHANED QUESTIONS" },
            { icon: <GitBranch className="w-5 h-5" />, value: deleteStats.questions > 0 ? (language === 'vi' ? "Cao" : "High") : (language === 'vi' ? "Thấp" : "Low"), label: language === 'vi' ? "ẢNH HƯỞNG CẤU TRÚC" : "TOPOLOGY IMPACT" }
          ]}
          slideText={language === 'vi' ? "TRƯỢT ĐỂ XÓA" : "SLIDE TO EXECUTE PURGE"}
        />
      )}
    </div>
  );
};
