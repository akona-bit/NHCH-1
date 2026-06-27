import React, { useState, useEffect } from 'react';
import { Download, Plus, Clock, Search, BarChart2, X, Database, GitBranch } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../supabaseClient';
import { DeleteModal } from '../components/DeleteModal';

export const Users = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', ho_ten: '', role: 'user', domain_assignment: 'General' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    // Since we don't have the admin API, we can't easily insert into auth.users then profiles.
    // In a real app we'd call an Edge Function. Here we just show a message.
    alert("This requires Supabase Admin API to create auth user first. For demo, it is recorded in system logs.");
    await supabase.from('system_alerts').insert([{
      alert_id: `USER-ADD-${Math.floor(Math.random() * 1000)}`,
      type: 'INFO',
      title: 'User Creation Requested',
      description: `Request to create user ${newUser.email} with role ${newUser.role}`,
      timestamp: new Date().toLocaleTimeString(),
    }]);
    setShowAddModal(false);
    setNewUser({ email: '', ho_ten: '', role: 'user', domain_assignment: 'General' });
  };

  const calculateRoleDistribution = () => {
    if (!users.length) return { smes: 0, reviewers: 0, staff: 0, admins: 0 };
    const counts = { smes: 0, reviewers: 0, staff: 0, admins: 0 };
    users.forEach(u => {
      const role = (u.role || '').toLowerCase();
      if (role.includes('admin')) counts.admins++;
      else if (role.includes('sme') || role.includes('expert')) counts.smes++;
      else if (role.includes('reviewer')) counts.reviewers++;
      else counts.staff++;
    });
    return {
      smes: Math.round((counts.smes / users.length) * 100),
      reviewers: Math.round((counts.reviewers / users.length) * 100),
      staff: Math.round((counts.staff / users.length) * 100),
      admins: Math.round((counts.admins / users.length) * 100),
    };
  };

  const handleBulkDelete = async () => {
    try {
      if (selectedItems.length === 0) return;
      
      const { error } = await supabase.from('profiles').delete().in('id', selectedItems);
      if (error) throw error;
      
      setSelectedItems([]);
      setBulkDeleteConfirm(false);
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      alert('Error bulk deleting users: ' + err.message);
    }
  };

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === users.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(users.map(u => u.id));
    }
  };

  const dist = calculateRoleDistribution();

  return (
    <div className="flex flex-col gap-6 h-full max-w-6xl mx-auto pb-10">
      <div className="flex justify-between items-end mb-4 border-b border-outline-variant/50 pb-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-on-surface mb-2">User Management</h1>
          <p className="text-xs text-on-surface-variant font-mono">System Users / Manage Roles-Based Access Control (RBAC) and assigned domains.</p>
        </div>
        <div className="flex gap-3 relative top-2">
           <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-outline" />
              </div>
              <input 
                type="text" 
                placeholder="Search users, roles..." 
                className="pl-10 pr-4 py-2 bg-surface shadow-sm border border-outline-variant rounded-full text-sm w-64 focus:outline-none focus:border-primary transition-all font-mono text-xs"
              />
            </div>
        </div>
      </div>

      <div className="flex gap-6 h-[500px]">
          <div className="flex-[3] bg-surface shadow-sm rounded-xl border border-outline-variant flex flex-col overflow-hidden">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center shrink-0">
              <h2 className="text-xl font-display font-semibold">Active Personnel</h2>
            <div className="flex gap-2">
              {selectedItems.length > 0 && (
                <button 
                  onClick={() => setBulkDeleteConfirm(true)}
                  className="px-4 py-2 bg-error hover:bg-error/90 text-on-primary font-medium rounded-lg text-sm transition-colors flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                  Delete ({selectedItems.length})
                </button>
              )}
              <button onClick={() => {
                const csvContent = "data:text/csv;charset=utf-8," 
                  + "ID,Name,Email,Role,Domain,Status\n"
                  + users.map(u => `"${u.id}","${u.ho_ten || ''}","${u.email || ''}","${u.role}","${u.domain_assignment || ''}","${u.status || 'Active'}"`).join("\n");
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", "users_export.csv");
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }} className="px-4 py-2 border border-outline-variant rounded-lg text-sm flex items-center hover:bg-surface shadow-sm transition-colors">
                <Download className="w-4 h-4 mr-2" /> Export CSV
              </button>
              <button 
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-primary text-on-primary font-medium rounded-lg text-sm flex items-center hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" /> Add User
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] font-bold text-on-surface-variant tracking-widest uppercase bg-surface shadow-sm-high sticky top-0">
                <tr>
                  <th className="px-6 py-4 w-12">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
                      checked={selectedItems.length === users.length && users.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-6 py-4">USER / ID</th>
                  <th className="px-6 py-4">ROLE</th>
                  <th className="px-6 py-4">DOMAIN ASSIGNMENT</th>
                  <th className="px-6 py-4">STATUS</th>
                  <th className="px-6 py-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/50">
                {loading ? (
                  <tr><td colSpan={5} className="p-8 text-center text-outline-variant">Loading users...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-outline-variant">No users found.</td></tr>
                ) : (
                  users.map(user => (
                    <tr key={user.id} className={cn("hover:bg-surface shadow-sm-high transition-colors", selectedItems.includes(user.id) && "bg-primary/5")}>
                      <td className="px-6 py-4">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer"
                          checked={selectedItems.includes(user.id)}
                          onChange={(e) => toggleSelection(user.id, e as unknown as React.MouseEvent)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className={cn(
                            "w-8 h-8 rounded border flex items-center justify-center font-bold mr-3",
                            user.role === 'admin' ? "bg-primary/20 text-primary border-primary/30" : "bg-background border-outline-variant text-on-surface"
                          )}>
                            {user.ho_ten ? user.ho_ten.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : '?')}
                          </div>
                          <div>
                            <div className="font-bold text-on-surface">{user.ho_ten || user.email}</div>
                            <div className="text-[10px] font-mono text-on-surface-variant">{user.id.substring(0, 8).toUpperCase()}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 text-[10px] rounded font-bold tracking-wide",
                          user.role === 'admin' ? "bg-error/20 text-error border border-error/30" : 
                          user.role === 'reviewer' ? "bg-background border border-tertiary/30 text-tertiary" :
                          "bg-background border border-outline-variant text-on-surface-variant"
                        )}>
                          {user.role || 'user'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1 flex-wrap">
                          {(user.domain_assignment ? user.domain_assignment.split(',') : ['General']).map((domain: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 border border-outline-variant rounded text-[10px] font-mono text-outline">
                              {domain.trim()}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={cn(
                          "flex items-center text-xs font-mono",
                          user.status === 'Offline' ? "text-outline" : "text-secondary"
                        )}>
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full mr-2",
                            user.status === 'Offline' ? "bg-outline" : "bg-secondary shadow-sm"
                          )}></span>
                          {user.status || 'Active'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          className="p-1 hover:bg-error/10 rounded text-outline hover:text-error transition-colors"
                          onClick={() => setItemToDelete(user)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-6">
          <div className="bg-surface shadow-sm rounded-xl border border-outline-variant p-6 shrink-0">
            <h3 className="text-sm font-bold text-on-surface mb-6 flex items-center">
              <BarChart2 className="w-4 h-4 mr-2 text-outline" /> Role Distribution
            </h3>
            <div className="space-y-4 text-xs font-mono">
              <div>
                <div className="flex justify-between text-on-surface mb-1"><span>SMEs</span><span>{dist.smes}%</span></div>
                <div className="h-1 bg-background rounded"><div className="h-full bg-primary rounded" style={{ width: `${dist.smes}%` }}></div></div>
              </div>
              <div>
                <div className="flex justify-between text-on-surface mb-1"><span>Reviewers</span><span>{dist.reviewers}%</span></div>
                <div className="h-1 bg-background rounded"><div className="h-full bg-tertiary rounded" style={{ width: `${dist.reviewers}%` }}></div></div>
              </div>
              <div>
                <div className="flex justify-between text-on-surface mb-1"><span>Staff</span><span>{dist.staff}%</span></div>
                <div className="h-1 bg-background rounded"><div className="h-full bg-outline rounded" style={{ width: `${dist.staff}%` }}></div></div>
              </div>
              <div>
                <div className="flex justify-between text-on-surface mb-1"><span>Admins</span><span>{dist.admins}%</span></div>
                <div className="h-1 bg-background rounded"><div className="h-full bg-error rounded" style={{ width: `${dist.admins}%` }}></div></div>
              </div>
            </div>
          </div>

          <div className="bg-surface shadow-sm rounded-xl border border-outline-variant p-6 flex-1 overflow-auto">
             <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold text-on-surface flex items-center">
                <Clock className="w-4 h-4 mr-2 text-outline" /> Activity Log
              </h3>
              <button className="text-[10px] font-mono text-outline hover:text-on-surface">View All</button>
            </div>
            
            <div className="relative border-l border-outline-variant/30 ml-2 space-y-6 pb-4">
              <div className="relative pl-6">
                <div className="absolute -left-1.5 top-1 w-3 h-3 bg-background border-2 border-outline rounded-full"></div>
                <p className="text-xs font-bold text-on-surface mb-0.5">Role updated</p>
                <p className="text-[10px] font-mono text-on-surface-variant mb-1">Permissions adjusted for recent SMEs.</p>
                <p className="text-[9px] font-mono text-outline">10 mins ago • by System</p>
              </div>
              <div className="relative pl-6">
                <div className="absolute -left-1.5 top-1 w-3 h-3 bg-background border-2 border-outline rounded-full"></div>
                <p className="text-xs font-bold text-on-surface mb-0.5">Database synced</p>
                <p className="text-[10px] font-mono text-on-surface-variant mb-1">Profiles synchronized with auth provider.</p>
                <p className="text-[9px] font-mono text-outline">2 hours ago • by System</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-surface shadow-sm border border-outline-variant rounded-xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-display font-semibold text-on-surface">Add New User</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-surface-bright rounded-full text-outline transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-on-surface-variant mb-1">Email</label>
                <input 
                  type="email" 
                  required
                  value={newUser.email}
                  onChange={e => setNewUser({...newUser, email: e.target.value})}
                  className="w-full px-3 py-2 bg-background border border-outline-variant rounded text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 text-on-surface"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-on-surface-variant mb-1">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={newUser.ho_ten}
                  onChange={e => setNewUser({...newUser, ho_ten: e.target.value})}
                  className="w-full px-3 py-2 bg-background border border-outline-variant rounded text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 text-on-surface"
                  placeholder="John Doe"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-on-surface-variant mb-1">Role</label>
                  <select 
                    value={newUser.role}
                    onChange={e => setNewUser({...newUser, role: e.target.value})}
                    className="w-full px-3 py-2 bg-background border border-outline-variant rounded text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 text-on-surface"
                  >
                    <option value="user">User</option>
                    <option value="sme">SME</option>
                    <option value="reviewer">Reviewer</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono text-on-surface-variant mb-1">Domain</label>
                  <input 
                    type="text" 
                    value={newUser.domain_assignment}
                    onChange={e => setNewUser({...newUser, domain_assignment: e.target.value})}
                    className="w-full px-3 py-2 bg-background border border-outline-variant rounded text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 text-on-surface"
                    placeholder="e.g. IT, Math"
                  />
                </div>
              </div>
              
              <div className="pt-4 flex gap-3 justify-end">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-outline-variant rounded-lg text-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-bright transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-primary text-on-primary font-medium rounded-lg text-sm hover:bg-primary/90 transition-colors"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {itemToDelete && (
        <DeleteModal
          isOpen={true}
          onClose={() => setItemToDelete(null)}
          onConfirm={async () => {
            try {
              // Check for dependencies
              const [q, a, e] = await Promise.all([
                supabase.from('cau_hoi').select('ma_cau_hoi').eq('nguoi_tao', itemToDelete.id).limit(1),
                supabase.from('ngu_lieu').select('ma_ngu_lieu').eq('nguoi_tao', itemToDelete.id).limit(1),
                supabase.from('ky_thi').select('ma_ky_thi').eq('nguoi_tao', itemToDelete.id).limit(1)
              ]);
              
              if ((q.data && q.data.length > 0) || (a.data && a.data.length > 0) || (e.data && e.data.length > 0)) {
                alert('Cannot delete this user because they have created questions, assets, or exams.');
                setItemToDelete(null);
                return;
              }

              await supabase.from('profiles').delete().eq('id', itemToDelete.id);
              fetchUsers();
              setItemToDelete(null);
            } catch(err) {
              console.error(err);
              alert('Error deleting user');
            }
          }}
          title={
            <span>
              Delete User <span className="text-error">{itemToDelete.email}</span>
            </span>
          }
          description="This will permanently remove the user account and all associated data from the system."
          stats={[
            { icon: <Database className="w-5 h-5" />, value: "100%", label: "DATA PURGED" },
            { icon: <GitBranch className="w-5 h-5" />, value: itemToDelete?.role === 'admin' ? "High" : "Low", label: "SYSTEM IMPACT" }
          ]}
          slideText="SLIDE TO EXECUTE PURGE"
        />
      )}

      {bulkDeleteConfirm && (
        <DeleteModal
          isOpen={true}
          onClose={() => setBulkDeleteConfirm(false)}
          onConfirm={handleBulkDelete}
          title="Bulk Delete Users"
          description={`Are you sure you want to permanently delete ${selectedItems.length} selected users? This action cannot be undone.`}
          stats={[
            { icon: <Database className="w-5 h-5" />, value: selectedItems.length.toString(), label: "USER COUNT" }
          ]}
          slideText="SLIDE TO EXECUTE PURGE"
        />
      )}
    </div>
  );
};
