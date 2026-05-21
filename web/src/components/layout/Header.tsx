'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationBell } from '@/components/notifications/NotificationBell';

interface HeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

export function Header({ title, subtitle, children }: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {children}
        {user?.mustChangePassword && (
          <span className="text-xs bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-medium">
            Please change your password
          </span>
        )}
        <NotificationBell />
      </div>
    </header>
  );
}
