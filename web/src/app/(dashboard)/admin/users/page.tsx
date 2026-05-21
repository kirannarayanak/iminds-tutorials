'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge, RoleBadge } from '@/components/ui/Badge';
import { LoadingSpinner, EmptyState } from '@/components/ui/LoadingSpinner';
import { User } from '@/types';
import { getErrorMessage } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Search, UserCheck, UserX, Key, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface UserFormData {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  role: string;
  grade: string;
  parentName: string;
  parentEmail: string;
  parentMobile: string;
  qualification: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCredentials, setNewCredentials] = useState<{ username: string; defaultPassword: string } | null>(null);

  const { register, handleSubmit, reset } = useForm<UserFormData>({ defaultValues: { role: 'teacher' } });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      const { data } = await api.get(`/users?${params}`);
      setUsers(data.data);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, [search, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function onCreateUser(formData: UserFormData) {
    setCreating(true);
    try {
      const payload: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email || undefined,
        mobile: formData.mobile || undefined,
        role: 'teacher',
        profile: { qualification: formData.qualification },
      };
      const { data } = await api.post('/users', payload);
      setNewCredentials({ username: data.data.username, defaultPassword: data.data.defaultPassword });
      setShowCreate(false);
      reset();
      fetchUsers();
      toast.success('User created successfully!');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setCreating(false); }
  }

  async function toggleStatus(userId: string) {
    try {
      const { data } = await api.patch(`/users/${userId}/toggle-status`);
      toast.success(data.data.isActive ? 'User activated' : 'User deactivated');
      fetchUsers();
    } catch (err) { toast.error(getErrorMessage(err)); }
  }

  async function resetPassword(userId: string, username: string) {
    if (!confirm(`Reset password for ${username}?`)) return;
    try {
      const { data } = await api.post(`/users/${userId}/reset-password`);
      setNewCredentials({ username, defaultPassword: data.data.newPassword });
      toast.success('Password reset!');
    } catch (err) { toast.error(getErrorMessage(err)); }
  }

  async function deleteUser(user: User) {
    const label = `${user.first_name} ${user.last_name}`;
    if (!confirm(`Permanently delete ${user.role} "${label}" (@${user.username})?\n\nThis action cannot be undone. Their assignments and enrolments will be removed.`)) return;
    try {
      const { data } = await api.delete(`/users/${user.id}`);
      toast.success(data.message || 'User deleted');
      fetchUsers();
    } catch (err) { toast.error(getErrorMessage(err)); }
  }

  return (
    <>
      <Header title="Teachers" subtitle="Create teacher accounts. Students sign up themselves." />
      <div className="p-8 space-y-6">

        {/* Toolbar */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-3 flex-1">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or username..."
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Roles</option>
              <option value="teacher">Teachers</option>
              <option value="student">Students</option>
            </select>
          </div>
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => { reset({ role: 'teacher' }); setShowCreate(true); }}>Add Teacher</Button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? <LoadingSpinner /> : users.length === 0 ? (
            <EmptyState title="No users found" description="Try adjusting your search or create a new user." />
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Name</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Username</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Email / Mobile</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Role</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium">{u.first_name} {u.last_name}</td>
                    <td className="px-6 py-3 font-mono text-xs text-gray-600">{u.username}</td>
                    <td className="px-6 py-3 text-gray-500 text-xs">{u.email || u.mobile || '—'}</td>
                    <td className="px-6 py-3"><RoleBadge role={u.role} /></td>
                    <td className="px-6 py-3">
                      <Badge color={u.is_active ? 'green' : 'red'}>{u.is_active ? 'Active' : 'Inactive'}</Badge>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => toggleStatus(u.id)} title={u.is_active ? 'Deactivate' : 'Activate'}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500">
                          {u.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                        <button onClick={() => resetPassword(u.id, u.username)} title="Reset password"
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500">
                          <Key className="w-4 h-4" />
                        </button>
                        {u.role !== 'admin' && (
                          <button onClick={() => deleteUser(u)} title="Delete user"
                            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-gray-500 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); reset(); }} title="Add Teacher" size="lg">
        <p className="text-sm text-gray-500 mb-4">Students register on their own at the sign-up page (email + password).</p>
        <form onSubmit={handleSubmit(onCreateUser)} className="space-y-4">
          <input type="hidden" {...register('role')} value="teacher" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input {...register('firstName', { required: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input {...register('lastName', { required: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input {...register('email')} type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
              <input {...register('mobile')} type="tel"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>

          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Qualification</label>
            <input {...register('qualification')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={creating} className="flex-1">Create Teacher</Button>
            <Button type="button" variant="outline" onClick={() => { setShowCreate(false); reset(); }}>Cancel</Button>
          </div>
        </form>
      </Modal>

      {/* Credentials Modal */}
      <Modal open={!!newCredentials} onClose={() => setNewCredentials(null)} title="User Credentials" size="sm">
        {newCredentials && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Share these credentials with the user. They will be prompted to change their password on first login.</p>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 font-mono text-sm">
              <div><span className="text-gray-500">Username: </span><span className="font-bold text-gray-900">{newCredentials.username}</span></div>
              <div><span className="text-gray-500">Password: </span><span className="font-bold text-gray-900">{newCredentials.defaultPassword}</span></div>
            </div>
            <Button onClick={() => setNewCredentials(null)} className="w-full">Done</Button>
          </div>
        )}
      </Modal>
    </>
  );
}
