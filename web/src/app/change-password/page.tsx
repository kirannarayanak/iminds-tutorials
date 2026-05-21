'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/lib/api';
import { BookOpen, Eye, EyeOff } from 'lucide-react';

interface Form {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ChangePasswordPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<Form>();
  const newPw = watch('newPassword');

  async function onSubmit(data: Form) {
    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success('Password changed! Please log in again.');
      logout();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-700 to-brand-indigo flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <BookOpen className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-white">Change Your Password</h1>
          <p className="text-primary-200 mt-1">You must change your password before continuing.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <input {...register('currentPassword', { required: 'Required' })} type={showPw ? 'text' : 'password'}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              {errors.currentPassword && <p className="text-red-500 text-xs mt-1">{errors.currentPassword.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input {...register('newPassword', { required: 'Required', minLength: { value: 6, message: 'Min 6 characters' } })} type={showPw ? 'text' : 'password'}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              {errors.newPassword && <p className="text-red-500 text-xs mt-1">{errors.newPassword.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input {...register('confirmPassword', {
                required: 'Required',
                validate: (v) => v === newPw || 'Passwords do not match'
              })} type={showPw ? 'text' : 'password'}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={showPw} onChange={(e) => setShowPw(e.target.checked)} className="rounded" />
              Show passwords
            </label>

            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-60">
              {loading ? 'Saving...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
