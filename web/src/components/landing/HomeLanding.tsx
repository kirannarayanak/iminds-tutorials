'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  BookOpen,
  GraduationCap,
  Users,
  Shield,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

const roles = [
  {
    id: 'student',
    title: 'Student',
    description: 'Browse courses, pay securely, and learn with videos, materials, and quizzes.',
    icon: GraduationCap,
    href: '/register',
    secondaryHref: '/login?role=student',
    primaryLabel: 'Create free account',
    secondaryLabel: 'Sign in',
    accent: 'from-blue-500 to-blue-700',
    ring: 'ring-blue-200 hover:ring-blue-400',
  },
  {
    id: 'teacher',
    title: 'Teacher',
    description: 'Create courses, add modules, upload materials, and track your students.',
    icon: Users,
    href: '/login?role=teacher',
    primaryLabel: 'Teacher sign in',
    accent: 'from-violet-500 to-violet-700',
    ring: 'ring-violet-200 hover:ring-violet-400',
  },
  {
    id: 'admin',
    title: 'Admin',
    description: 'Manage teachers, courses, payments, enrollments, and daily attendance.',
    icon: Shield,
    href: '/login?role=admin',
    primaryLabel: 'Admin sign in',
    accent: 'from-slate-600 to-slate-800',
    ring: 'ring-slate-200 hover:ring-slate-400',
  },
] as const;

export function HomeLanding() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user?.mustChangePassword) {
      router.replace('/change-password');
      return;
    }
    if (user) {
      router.replace(`/${user.role}`);
    }
  }, [user, loading, router]);

  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading iMinds Tutorials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-950 via-primary-900 to-brand-indigo text-white">
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center shadow-lg">
            <BookOpen className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <p className="font-bold text-lg leading-tight">iMinds Tutorials</p>
            <p className="text-xs text-primary-200">CBSE Grade 9 & 10</p>
          </div>
        </div>
        <Link
          href="/login"
          className="text-sm font-medium text-white/90 hover:text-white border border-white/25 px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          Sign in
        </Link>
      </header>

      <main className="max-w-6xl mx-auto px-6 pb-20">
        <section className="text-center pt-8 pb-14">
          <div className="inline-flex items-center gap-2 bg-white/10 text-primary-100 text-xs font-medium px-3 py-1 rounded-full mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Online tuition for Science & Maths
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Welcome to <span className="text-primary-200">iMinds</span> Tutorials
          </h1>
          <p className="text-lg text-primary-100/90 max-w-2xl mx-auto">
            Choose how you want to enter the platform — student, teacher, or administrator.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6" aria-label="Choose your role">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <article
                key={role.id}
                className={`bg-white rounded-2xl shadow-xl p-6 text-gray-900 ring-2 ${role.ring} transition-all hover:-translate-y-1`}
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${role.accent} flex items-center justify-center mb-4`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">{role.title}</h2>
                <p className="text-sm text-gray-600 mb-6 min-h-[4rem]">{role.description}</p>
                <Link
                  href={role.href}
                  className={`flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-gradient-to-r ${role.accent} text-white font-semibold text-sm hover:opacity-95 transition-opacity`}
                >
                  {role.primaryLabel}
                  <ArrowRight className="w-4 h-4" />
                </Link>
                {'secondaryHref' in role && role.secondaryHref && (
                  <Link
                    href={role.secondaryHref}
                    className="block text-center text-sm text-primary-600 font-medium mt-3 hover:underline"
                  >
                    {role.secondaryLabel}
                  </Link>
                )}
              </article>
            );
          })}
        </section>

        <section className="mt-16 text-center text-primary-200/80 text-sm">
          <p>Structured courses · Secure payments · Quizzes · Class attendance</p>
        </section>
      </main>

      <footer className="border-t border-white/10 py-6 text-center text-xs text-primary-300/70">
        © {new Date().getFullYear()} iMinds Tutorials. CBSE Grade 9 & 10 online learning.
      </footer>
    </div>
  );
}
