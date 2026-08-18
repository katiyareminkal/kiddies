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
  AlertTriangle,
  Users as UsersIcon,
  Shield,
  Sparkles
} from 'lucide-react';
import { UserRole } from '../types';

const Users: React.FC = () => {
  const { users, currentUser, addUser, updateUser, deleteUser, settings } = useApp();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Local state for form
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.STAFF);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);

  // Security Guard: Only Admins can access this page
  if (currentUser?.role !== UserRole.ADMIN) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-slide-up px-4 max-w-md mx-auto">
        <div className="w-16 h-16 bg-rose-50 border-2 border-rose-200 text-rose-600 rounded-lg flex items-center justify-center mb-6 shadow-xs">
          <AlertOctagon size={36} strokeWidth={2} />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Access Restricted</h2>
        <p className="text-slate-500 mt-2 text-xs font-semibold leading-relaxed">
          The User & Role Management console is reserved for system administrators. Please contact your store owner if you require elevated permissions.
        </p>
        <button
          className="mt-6 px-6 py-2.5 bg-slate-900 text-white rounded-md font-extrabold text-xs uppercase tracking-wider shadow-xs transition-all"
          onClick={() => window.history.back()}
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const filteredUsers = users.filter(u =>
    (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
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
    setUserPermissions(['dashboard', 'sales', 'inventory']);
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
    <div className="space-y-5 animate-nano pb-20 max-w-[1600px] mx-auto">
      {/* ── Executive Header ── */}
      <div className="bg-white border border-slate-200/80 rounded-md p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-[#01a9fb] text-white flex items-center justify-center shadow-xs shrink-0">
            <Shield size={20} strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">Staff & Access Control</h1>
              <span className="text-[10px] font-extrabold text-[#01a9fb] bg-[#01a9fb]/10 border border-[#01a9fb]/30 px-2 py-0.5 rounded-md">
                {users.length} Active Accounts
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Manage store operator credentials, roles, and modular feature permissions</p>
          </div>
        </div>

        <button
          onClick={openAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#01a9fb] hover:bg-[#0098e6] text-white text-xs font-extrabold uppercase tracking-wider rounded-md shadow-xs transition-all active:scale-95"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>+ Add Staff Member</span>
        </button>
      </div>

      {/* ── Search Bar ── */}
      <div className="relative group max-w-lg">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#01a9fb] transition-colors" size={15} strokeWidth={2.5} />
        <input
          type="text"
          placeholder="Search staff by name or email address..."
          className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200/80 rounded-md text-xs font-bold text-slate-900 outline-none focus:border-[#01a9fb] focus:ring-2 focus:ring-[#01a9fb]/10 transition-all shadow-xs placeholder:text-slate-400"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* ── Users Directory Table ── */}
      <div className="bg-white rounded-md border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                <th className="px-5 py-3.5">User Identity</th>
                <th className="px-4 py-3.5">System Role</th>
                <th className="px-4 py-3.5">Access Scope</th>
                <th className="px-4 py-3.5">Registered</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-slate-50/70 transition-colors group">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-md flex items-center justify-center font-extrabold text-sm shadow-xs shrink-0 ${user.role === 'ADMIN'
                        ? 'bg-[#01a9fb] text-white'
                        : 'bg-[#fe569f]/10 text-[#fe569f] border border-[#fe569f]/30'
                        }`}>
                        {(user.name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-extrabold text-slate-900 flex items-center gap-2">
                          <span className="truncate">{user.name}</span>
                          {user.id === currentUser?.id && (
                            <span className="bg-[#01a9fb]/10 text-[#01a9fb] border border-[#01a9fb]/30 text-[9px] px-1.5 py-0.2 rounded-md font-extrabold">
                              YOU
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-0.5 truncate">
                          <Mail size={11} className="text-slate-400" />
                          <span>{user.email}</span>
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${user.role === UserRole.ADMIN
                      ? 'bg-[#01a9fb] text-white shadow-xs'
                      : 'bg-[#fe569f]/10 text-[#fe569f] border border-[#fe569f]/30'
                      }`}>
                      {user.role === UserRole.ADMIN ? <ShieldCheck size={12} strokeWidth={2.5} /> : <UserIcon size={12} strokeWidth={2.5} />}
                      <span>{user.role}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="max-w-xs">
                      {user.role === UserRole.ADMIN ? (
                        <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                          <Unlock size={13} className="text-[#01a9fb]" />
                          <span>Full System Control</span>
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {user.permissions && user.permissions.length > 0 ? (
                            user.permissions.map(p => {
                              const item = NAVIGATION_ITEMS.find(i => i.id === p);
                              return (
                                <span key={p} className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded font-bold border border-slate-200">
                                  {item?.label || p}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-[11px] font-semibold text-slate-400 italic">No modules enabled</span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-slate-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEdit(user)}
                        className="p-1.5 text-slate-400 hover:text-[#01a9fb] hover:bg-[#01a9fb]/10 rounded-md transition-colors"
                        title="Edit Permissions"
                      >
                        <Edit2 size={15} strokeWidth={2.2} />
                      </button>
                      {user.id !== currentUser?.id && settings?.enableDeleteUsers && (
                        <button
                          onClick={() => handleDeleteClick(user.id)}
                          className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          title="Revoke Access & Delete"
                        >
                          <Trash2 size={15} strokeWidth={2.2} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="py-14 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
              No staff members found matching search query
            </div>
          )}
        </div>
      </div>

      {/* ── Delete Confirmation Modal ── */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Revoke Staff Access"
      >
        <div className="p-4 text-center space-y-4">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg flex items-center justify-center mx-auto shadow-xs">
            <AlertTriangle size={32} strokeWidth={2} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Are you sure you want to remove this user?</h3>
            <p className="text-xs text-slate-500 mt-1">
              Removing this account will immediately terminate active sessions and revoke terminal access.
            </p>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="flex-1 py-2.5 rounded-md font-extrabold uppercase tracking-wider text-xs border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="flex-1 py-2.5 rounded-md font-extrabold uppercase tracking-wider text-xs bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
            >
              Confirm Removal
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Add/Edit User Modal ── */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingUserId ? "Edit Staff Account & Permissions" : "Register New Staff Member"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Full Name *</label>
                <input name="name" defaultValue={editingUser?.name} required className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-md outline-none font-extrabold text-xs text-slate-900" placeholder="Jane Doe" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Email Address *</label>
                <input name="email" type="email" defaultValue={editingUser?.email} required className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-md outline-none font-extrabold text-xs text-slate-900" placeholder="staff@kiddies.store" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Terminal Password *</label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input name="password" type="password" defaultValue={editingUser?.password} required className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-md outline-none font-extrabold text-xs text-slate-900" placeholder="••••••••" />
              </div>
            </div>
          </div>

          {/* Role Selector */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Assigned Role</label>
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => setSelectedRole(UserRole.ADMIN)}
                className={`cursor-pointer p-3.5 rounded-md border-2 transition-all ${selectedRole === UserRole.ADMIN
                  ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                  : 'border-slate-200 bg-slate-50 hover:border-slate-300 text-slate-700'
                  }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <ShieldCheck size={16} />
                  {selectedRole === UserRole.ADMIN && <span className="text-[9px] font-extrabold bg-indigo-500 text-white px-1.5 py-0.2 rounded">ACTIVE</span>}
                </div>
                <h4 className="font-extrabold text-xs">Store Admin</h4>
                <p className={`text-[10px] mt-0.5 ${selectedRole === UserRole.ADMIN ? 'text-slate-400' : 'text-slate-500'}`}>Full unrestricted access</p>
              </div>

              <div
                onClick={() => setSelectedRole(UserRole.STAFF)}
                className={`cursor-pointer p-3.5 rounded-md border-2 transition-all ${selectedRole === UserRole.STAFF
                  ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 shadow-xs'
                  : 'border-slate-200 bg-slate-50 hover:border-slate-300 text-slate-700'
                  }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <UserIcon size={16} />
                  {selectedRole === UserRole.STAFF && <span className="text-[9px] font-extrabold bg-indigo-600 text-white px-1.5 py-0.2 rounded">ACTIVE</span>}
                </div>
                <h4 className="font-extrabold text-xs">Store Staff</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Custom module access</p>
              </div>
            </div>
          </div>

          {/* Module Permissions (Staff only) */}
          {selectedRole === UserRole.STAFF && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Module Permissions</label>
              <div className="grid grid-cols-2 gap-2">
                {NAVIGATION_ITEMS.filter(item => item.id !== 'settings' && item.id !== 'users').map((item) => (
                  <label
                    key={item.id}
                    className={`flex items-center gap-2 p-2 rounded-md border transition-all cursor-pointer ${userPermissions.includes(item.id)
                      ? 'bg-indigo-50/70 border-indigo-300 text-indigo-950 font-extrabold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 font-bold'
                      }`}
                  >
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      checked={userPermissions.includes(item.id)}
                      onChange={() => togglePermission(item.id)}
                    />
                    <span className="text-xs">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-2.5 rounded-md font-extrabold uppercase tracking-wider text-xs border border-slate-200 text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 rounded-md font-extrabold uppercase tracking-wider text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs">
              {editingUserId ? 'Update Staff Member' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Users;
