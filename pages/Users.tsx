
import React, { useState } from 'react';
import { useApp } from '../store/AppContext';
import { Card, Button, Modal } from '../components/Shared';
import { NAVIGATION_ITEMS } from '../constants';
import { 
  Plus, 
  Search, 
  ShieldCheck, 
  User as UserIcon, 
  Mail, 
  Trash2, 
  Lock,
  Edit2,
  CheckCircle2,
  AlertOctagon,
  Unlock,
  KeyRound,
  AlertTriangle
} from 'lucide-react';
import { UserRole } from '../types';

const Users: React.FC = () => {
  const { users, currentUser, addUser, updateUser, deleteUser } = useApp();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  
  // Local state for form
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.STAFF);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);

  // Security Guard: Only Admins can access this page
  if (currentUser?.role !== UserRole.ADMIN) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center animate-slide-up px-4">
         <div className="bg-secondary/5 p-10 rounded-[3rem] text-secondary mb-8 shadow-premium border-4 border-secondary/10 relative group overflow-hidden">
            <div className="absolute inset-0 bg-secondary/10 scale-0 group-hover:scale-150 transition-transform duration-700 rounded-full"></div>
            <AlertOctagon size={80} strokeWidth={1.5} className="relative z-10" />
         </div>
         <h2 className="text-3xl md:text-4xl font-display font-black text-slate-900 tracking-tight">Access <span className="text-secondary">Restricted</span></h2>
         <p className="text-slate-500 mt-4 font-bold max-w-md mx-auto leading-relaxed uppercase tracking-widest text-[10px]">
           The User Management module is reserved for system administrators. 
           Please contact your supervisor if you require elevated permissions.
         </p>
         <Button variant="secondary" className="mt-10 h-14 px-10 rounded-2xl font-black uppercase tracking-widest text-[10px] border-2 border-slate-100 hover:border-secondary hover:text-secondary transition-all" onClick={() => window.history.back()}>
            Go Back Home
         </Button>
      </div>
    );
  }

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const userData = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      role: selectedRole,
      permissions: selectedRole === UserRole.ADMIN ? [] : userPermissions,
    };

    if (editingUserId) {
      updateUser(editingUserId, userData);
      setEditingUserId(null);
    } else {
      addUser(userData);
    }
    setIsAddModalOpen(false);
  };

  const togglePermission = (id: string) => {
    setUserPermissions(prev => 
      prev.includes(id) 
        ? prev.filter(p => p !== id) 
        : [...prev, id]
    );
  };

  const openEdit = (user: any) => {
    setEditingUserId(user.id);
    setSelectedRole(user.role);
    setUserPermissions(user.permissions || []);
    setIsAddModalOpen(true);
  };

  const openAdd = () => {
    setEditingUserId(null);
    setSelectedRole(UserRole.STAFF);
    setUserPermissions(['dashboard', 'sales', 'inventory']); // Default for new staff
    setIsAddModalOpen(true);
  };

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  const handleDeleteClick = (id: string) => {
    setUserToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (userToDelete) {
      deleteUser(userToDelete);
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
    }
  };

  const editingUser = editingUserId ? users.find(u => u.id === editingUserId) : null;

  return (
    <div className="space-y-6 animate-nano pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 font-display tracking-tighter">Users</h1>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] mt-1">Access Control</p>
        </div>
        <button 
          onClick={openAdd} 
          className="banana-btn px-8 py-4 text-[10px]"
        >
          <Plus size={18} strokeWidth={3} className="mr-2 inline-block" /> Add New User
        </button>
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900 transition-colors" size={16} strokeWidth={3} />
        <input 
          type="text" 
          placeholder="Search by name or email..." 
          className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-highlight/30 transition-all shadow-nano"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="nano-card overflow-hidden">
        <div className="overflow-x-auto hide-scrollbar">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-50 text-slate-400">
                <th className="px-8 py-5 font-black uppercase text-[9px] tracking-widest">User Identity</th>
                <th className="px-8 py-5 font-black uppercase text-[9px] tracking-widest">System Role</th>
                <th className="px-8 py-5 font-black uppercase text-[9px] tracking-widest">Access Scope</th>
                <th className="px-8 py-5 font-black uppercase text-[9px] tracking-widest">Joined</th>
                <th className="px-8 py-5 font-black uppercase text-[9px] tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-all group">
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-slate-900 font-black text-lg shadow-nano relative overflow-hidden group-hover:scale-110 transition-transform ${user.role === 'ADMIN' ? 'bg-highlight' : 'bg-slate-100'}`}>
                         {user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-black text-slate-900 flex items-center gap-2 text-[11px] uppercase tracking-tight">
                           {user.name} 
                           {user.id === currentUser?.id && <span className="bg-slate-900 text-highlight text-[8px] px-2 py-0.5 rounded-lg font-black uppercase tracking-widest border border-slate-800">YOU</span>}
                        </div>
                        <div className="text-[9px] text-slate-400 flex items-center gap-1.5 mt-1 font-black uppercase tracking-widest">
                           <Mail size={12} strokeWidth={3} /> {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${
                       user.role === UserRole.ADMIN ? 'bg-slate-900 text-highlight shadow-banana' : 'bg-slate-100 text-slate-400'
                    }`}>
                       {user.role === UserRole.ADMIN ? <ShieldCheck size={12} strokeWidth={3} /> : <UserIcon size={12} strokeWidth={3} />}
                       {user.role}
                    </div>
                  </td>
                  <td className="px-8 py-4">
                     <div className="max-w-[250px]">
                         {user.role === UserRole.ADMIN ? (
                           <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                             <Unlock size={12} strokeWidth={3} className="text-highlight" /> Full System Control
                           </span>
                         ) : (
                           <div className="flex flex-wrap gap-1.5">
                              {user.permissions && user.permissions.length > 0 ? (
                                user.permissions.slice(0, 3).map(p => {
                                   const item = NAVIGATION_ITEMS.find(i => i.id === p);
                                   return (
                                     <span key={p} className="bg-slate-50 text-slate-400 text-[8px] px-2 py-1 rounded-lg font-black uppercase tracking-widest border border-slate-100">
                                       {item?.label || p}
                                     </span>
                                   )
                                })
                              ) : (
                                 <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 italic">No access</span>
                              )}
                              {user.permissions && user.permissions.length > 3 && (
                                 <span className="bg-slate-50 text-slate-300 text-[8px] px-2 py-1 rounded-lg font-black border border-slate-100">
                                   +{user.permissions.length - 3}
                                 </span>
                              )}
                           </div>
                         )}
                     </div>
                  </td>
                  <td className="px-8 py-4">
                     <span className="text-slate-400 font-black text-[9px] uppercase tracking-widest">{new Date(user.createdAt).toLocaleDateString()}</span>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button onClick={() => openEdit(user)} className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-highlight rounded-xl transition-all shadow-nano" title="Edit User">
                         <Edit2 size={18} strokeWidth={3} />
                       </button>
                       {user.id !== currentUser?.id && (
                          <button onClick={() => handleDeleteClick(user.id)} className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all shadow-nano" title="Delete User">
                            <Trash2 size={18} strokeWidth={3} />
                          </button>
                       )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className="py-20 text-center text-slate-400 font-black uppercase tracking-widest text-[9px]">No users found matching your search.</div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Deletion"
      >
        <div className="p-8 text-center">
          <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-nano border-4 border-rose-100">
            <AlertTriangle size={48} strokeWidth={1.5} />
          </div>
          <h3 className="text-2xl font-display font-black text-slate-900 tracking-tighter">Are you sure?</h3>
          <p className="text-slate-500 font-black mt-4 leading-relaxed uppercase tracking-widest text-[9px]">
            Removing this user will immediately revoke their access to the system. This action is permanent.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
            <button onClick={() => setIsDeleteModalOpen(false)} className="w-full sm:flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[9px] border border-slate-100 text-slate-400">
              Keep User
            </button>
            <button onClick={confirmDelete} className="w-full sm:flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[9px] shadow-nano bg-rose-500 text-white active:scale-95 transition-all">
              Confirm Removal
            </button>
          </div>
        </div>
      </Modal>

      {/* Add/Edit User Modal */}
      <Modal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        title={editingUserId ? "Edit User & Access" : "Create New User"}
      >
        <form onSubmit={handleSubmit} className="p-1 space-y-5 md:space-y-6">
          {/* User Details Section */}
          <div className="space-y-4 md:space-y-5">
            <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-slate-900 text-highlight flex items-center justify-center shadow-banana">
                    <UserIcon size={14} strokeWidth={3} />
                </div>
                <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-900">Personal Information</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
                    <input name="name" defaultValue={editingUser?.name} required className="w-full px-4 py-3 bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-xl md:rounded-2xl outline-none transition-all font-black text-slate-900 text-[10px] uppercase tracking-widest" placeholder="Jane Doe" />
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                    <input name="email" type="email" defaultValue={editingUser?.email} required className="w-full px-4 py-3 bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-xl md:rounded-2xl outline-none transition-all font-black text-slate-900 text-[10px] uppercase tracking-widest" placeholder="jane@kiddies.store" />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">System Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={16} strokeWidth={3} />
                  <input name="password" type="password" defaultValue={editingUser?.password} required className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-transparent focus:bg-white focus:border-highlight/30 rounded-xl md:rounded-2xl outline-none transition-all font-black text-slate-900 text-[10px] uppercase tracking-widest" placeholder="••••••••" />
                </div>
            </div>
          </div>

          {/* Role Selection Section */}
          <div className="space-y-4 md:space-y-5 pt-4 md:pt-6 border-t border-slate-100">
             <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-slate-900 text-highlight flex items-center justify-center shadow-banana">
                    <ShieldCheck size={14} strokeWidth={3} />
                </div>
                <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-900">System Role & Access</h4>
            </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div 
                  onClick={() => setSelectedRole(UserRole.ADMIN)}
                  className={`cursor-pointer p-4 md:p-5 rounded-2xl md:rounded-[1.75rem] border-2 transition-all relative overflow-hidden group ${selectedRole === UserRole.ADMIN ? 'border-slate-900 bg-slate-900 text-white shadow-banana' : 'border-slate-100 bg-slate-50/50 hover:border-slate-200'}`}
                >
                   <div className="flex justify-between items-start mb-3">
                      <div className={`p-2 rounded-xl ${selectedRole === UserRole.ADMIN ? 'bg-white/10 text-highlight' : 'bg-white text-slate-400 shadow-nano'}`}>
                         <ShieldCheck size={18} strokeWidth={3} />
                      </div>
                      {selectedRole === UserRole.ADMIN && <div className="bg-highlight text-slate-900 text-[8px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest">ACTIVE</div>}
                   </div>
                   <h4 className="font-display font-black text-base tracking-tighter">Administrator</h4>
                   <p className={`text-[8px] md:text-[9px] mt-1 leading-relaxed font-black uppercase tracking-widest ${selectedRole === UserRole.ADMIN ? 'text-slate-400' : 'text-slate-500'}`}>Full system control.</p>
                </div>

                <div 
                  onClick={() => setSelectedRole(UserRole.STAFF)}
                  className={`cursor-pointer p-4 md:p-5 rounded-2xl md:rounded-[1.75rem] border-2 transition-all relative overflow-hidden group ${selectedRole === UserRole.STAFF ? 'border-highlight bg-highlight text-slate-900 shadow-banana' : 'border-slate-100 bg-slate-50/50 hover:border-slate-200'}`}
                >
                   <div className="flex justify-between items-start mb-3">
                      <div className={`p-2 rounded-xl ${selectedRole === UserRole.STAFF ? 'bg-slate-900 text-highlight' : 'bg-white text-slate-400 shadow-nano'}`}>
                         <UserIcon size={18} strokeWidth={3} />
                      </div>
                      {selectedRole === UserRole.STAFF && <div className="bg-slate-900 text-highlight text-[8px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest">ACTIVE</div>}
                   </div>
                   <h4 className="font-display font-black text-base tracking-tighter">Staff Member</h4>
                   <p className={`text-[8px] md:text-[9px] mt-1 leading-relaxed font-black uppercase tracking-widest ${selectedRole === UserRole.STAFF ? 'text-slate-700' : 'text-slate-500'}`}>Restricted access.</p>
                </div>
             </div>
          </div>
          
          {/* Permission Checklist (Only for Staff) */}
          {selectedRole === UserRole.STAFF && (
            <div className="space-y-3 pt-2 md:pt-4 animate-nano">
                <div className="flex items-center gap-1.5 mb-1">
                  <KeyRound size={14} className="text-slate-900" strokeWidth={3} />
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Allowed Modules</label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {NAVIGATION_ITEMS.filter(item => item.id !== 'settings' && item.id !== 'users').map((item) => (
                        <label 
                            key={item.id} 
                            className={`flex items-center gap-2.5 p-2 px-3 rounded-xl border-2 transition-all cursor-pointer ${
                                userPermissions.includes(item.id) 
                                ? 'bg-white border-highlight shadow-banana' 
                                : 'bg-slate-50/50 border-transparent hover:border-slate-200'
                            }`}
                        >
                            <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                                userPermissions.includes(item.id) ? 'bg-slate-900 border-slate-900 scale-105' : 'border-slate-200 bg-white'
                            }`}>
                                {userPermissions.includes(item.id) && <CheckCircle2 size={12} className="text-highlight" strokeWidth={3} />}
                            </div>
                            <input 
                                type="checkbox" 
                                className="hidden" 
                                checked={userPermissions.includes(item.id)}
                                onChange={() => togglePermission(item.id)}
                            />
                            <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-widest ${userPermissions.includes(item.id) ? 'text-slate-900' : 'text-slate-400'}`}>{item.label}</span>
                        </label>
                    ))}
                </div>
                <div className="bg-highlight/10 p-2.5 md:p-3 rounded-xl md:rounded-2xl border border-highlight/20 flex items-start gap-2">
                    <AlertTriangle size={14} className="text-highlight shrink-0 mt-0.5" strokeWidth={3} />
                    <p className="text-[8px] md:text-[9px] text-slate-600 font-black uppercase tracking-widest leading-relaxed">
                        Note: "Settings" and "Users" are reserved for Administrators.
                    </p>
                </div>
            </div>
          )}
          
          <div className="flex flex-row gap-2 md:gap-4 pt-4 md:pt-6 border-t border-slate-100">
            <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 h-10 md:h-12 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[8px] md:text-[9px] border border-slate-100 text-slate-400 hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" className="banana-btn flex-1 h-10 md:h-12 text-[8px] md:text-[9px] rounded-xl md:rounded-2xl">
               {editingUserId ? 'Update' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Users;
