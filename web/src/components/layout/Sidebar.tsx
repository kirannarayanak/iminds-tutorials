'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { cn, getInitials } from '@/lib/utils';
import {
  LayoutDashboard, Users, BookOpen, Brain, CreditCard,
  Settings, LogOut, GraduationCap, BookMarked, ClipboardList
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const adminNav: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: '/admin/users', label: 'Teachers', icon: <Users className="w-4 h-4" /> },
  { href: '/admin/courses', label: 'Courses', icon: <BookOpen className="w-4 h-4" /> },
  { href: '/admin/database', label: 'Database', icon: <ClipboardList className="w-4 h-4" /> },
  { href: '/admin/payments', label: 'Payments', icon: <CreditCard className="w-4 h-4" /> },
];

const teacherNav: NavItem[] = [
  { href: '/teacher', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: '/teacher/courses', label: 'My Courses', icon: <BookOpen className="w-4 h-4" /> },
  { href: '/teacher/students', label: 'My Students', icon: <GraduationCap className="w-4 h-4" /> },
];

const studentNav: NavItem[] = [
  { href: '/student', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: '/student/courses', label: 'Courses', icon: <BookMarked className="w-4 h-4" /> },
  { href: '/student/quizzes', label: 'Quizzes', icon: <Brain className="w-4 h-4" /> },
  { href: '/student/payments', label: 'Payments', icon: <CreditCard className="w-4 h-4" /> },
];

const navMap = { admin: adminNav, teacher: teacherNav, student: studentNav };

export function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;
  const nav = navMap[user.role];

  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-gray-900 text-sm leading-tight">iMinds</div>
            <div className="text-xs text-gray-400">Tutorials</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {nav.map((item) => {
          const active = pathname === item.href || (item.href !== `/${user.role}` && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User profile */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-sm">
            {getInitials(user.firstName, user.lastName)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{user.firstName} {user.lastName}</p>
            <p className="text-xs text-gray-400 capitalize">{user.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 transition-colors w-full px-2 py-1.5 rounded-lg hover:bg-red-50"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
