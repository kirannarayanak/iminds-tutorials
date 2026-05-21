'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api, { getErrorMessage, setAuthTokens } from '@/lib/api';
import { BookOpen, Eye, EyeOff, ArrowLeft } from 'lucide-react';

interface RegisterForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  grade: string;
}

function mapUser(raw: Record<string, unknown>) {
  return {
    id: raw.id as string,
    username: raw.username as string,
    firstName: (raw.firstName ?? raw.first_name) as string,
    lastName: (raw.lastName ?? raw.last_name) as string,
    email: (raw.email as string | null) ?? null,
    role: raw.role as 'student',
    mustChangePassword: Boolean(raw.mustChangePassword ?? raw.must_change_password),
  };
}

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>();

  const password = watch('password');

  async function onSubmit(data: RegisterForm) {
    if (data.password !== data.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const { data: res } = await api.post('/auth/register', {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        grade: data.grade || undefined,
      });
      const { accessToken, refreshToken, user } = res.data;
      setAuthTokens(accessToken, refreshToken);
      mapUser(user);
      toast.success('Welcome! Browse courses and enroll to start learning.');
      window.location.href = '/student/courses';
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-700 to-brand-indigo flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-primary-200 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <BookOpen className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-white">Create your account</h1>
          <p className="text-primary-200 mt-1">Sign up with your email — like Udemy</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First name *</label>
                <input {...register('firstName', { required: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last name *</label>
                <input {...register('lastName', { required: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email (Gmail or any email) *</label>
              <input {...register('email', { required: true, pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' } })}
                type="email" autoComplete="email" placeholder="you@gmail.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              <p className="text-xs text-gray-400 mt-1">You will sign in with this email and your password.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
              <select {...register('grade')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">Select (optional)</option>
                <option value="9">Grade 9</option>
                <option value="10">Grade 10</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <div className="relative">
                <input {...register('password', { required: true, minLength: { value: 6, message: 'Min 6 characters' } })}
                  type={showPassword ? 'text' : 'password'} autoComplete="new-password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password *</label>
              <input {...register('confirmPassword', { required: true, validate: (v) => v === password || 'Passwords do not match' })}
                type="password" autoComplete="new-password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-60">
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-primary-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
