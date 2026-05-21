'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/lib/api';
import { BookOpen, Eye, EyeOff, GraduationCap, Users, Shield, ArrowLeft } from 'lucide-react';

interface LoginForm {
  username: string;
  password: string;
}

const roleMeta: Record<string, { label: string; hint: string; icon: typeof BookOpen; color: string }> = {
  student: {
    label: 'Student',
    hint: 'Use your email and password from registration.',
    icon: GraduationCap,
    color: 'text-blue-600 bg-blue-50',
  },
  teacher: {
    label: 'Teacher',
    hint: 'Sign in with credentials provided by your administrator.',
    icon: Users,
    color: 'text-violet-600 bg-violet-50',
  },
  admin: {
    label: 'Admin',
    hint: 'Administrator access for platform management.',
    icon: Shield,
    color: 'text-slate-700 bg-slate-100',
  },
};

function LoginFormContent() {
  const { login, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get('role') || '';
  const meta = roleMeta[role];

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();

  if (user) {
    router.replace(`/${user.role}`);
    return null;
  }

  async function onSubmit(data: LoginForm) {
    setLoading(true);
    try {
      const loggedIn = await login(data.username, data.password);
      if (role && loggedIn.role !== role) {
        toast.error(`This account is a ${loggedIn.role}, not ${role}. Redirecting…`);
      } else {
        toast.success('Welcome back!');
      }
      router.replace(`/${loggedIn.role}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const RoleIcon = meta?.icon || BookOpen;

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
          <h1 className="text-3xl font-bold text-white">iMinds Tutorials</h1>
          <p className="text-primary-200 mt-1">CBSE Grade 9 & 10 Online Learning</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {meta && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-4 text-sm font-medium ${meta.color}`}>
              <RoleIcon className="w-4 h-4" />
              Signing in as {meta.label}
            </div>
          )}

          <h2 className="text-xl font-semibold text-gray-800 mb-1">Sign in</h2>
          {meta && <p className="text-xs text-gray-500 mb-5">{meta.hint}</p>}
          {!meta && <div className="mb-5" />}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email or username</label>
              <input
                {...register('username', { required: 'Email or username is required' })}
                type="text"
                autoComplete="username"
                placeholder="your.email@gmail.com"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input
                  {...register('password', { required: 'Password is required' })}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {(role === 'student' || !role) && (
            <p className="text-center text-sm text-gray-500 mt-6">
              New student?{' '}
              <Link href="/register" className="text-primary-600 font-medium hover:underline">
                Create a free account
              </Link>
            </p>
          )}

          {!role && (
            <p className="text-center text-xs text-gray-400 mt-4">
              <Link href="/" className="text-primary-600 hover:underline">Choose Student, Teacher, or Admin</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-primary-900" />}>
      <LoginFormContent />
    </Suspense>
  );
}
