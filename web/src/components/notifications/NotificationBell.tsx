'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Bell, X } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  entity_type?: string;
  entity_id?: string;
  metadata?: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications');
      const payload = data.data;
      setItems(payload?.items ?? []);
      setUnreadCount(payload?.unreadCount ?? 0);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [user, load]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const markRead = async (id: string) => {
    await api.patch(`/notifications/${id}/read`);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await api.patch('/notifications/read-all');
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleClick = async (n: NotificationItem) => {
    if (!n.is_read) await markRead(n.id);
    setOpen(false);
    if (n.type === 'student_registered' && user?.role === 'admin') {
      router.push('/admin/users');
      return;
    }
    if (n.entity_type === 'course' && n.entity_id) {
      const base =
        user?.role === 'student'
          ? '/student/courses'
          : user?.role === 'teacher'
            ? '/teacher/courses'
            : '/admin/courses';
      router.push(`${base}/${n.entity_id}`);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) load();
        }}
        className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-500" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 max-h-[420px] bg-white border border-gray-200 rounded-xl shadow-lg z-50 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-sm text-gray-900">Notifications</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-xs text-primary-600 hover:underline"
                >
                  Mark all read
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {items.length === 0 ? (
              <p className="text-sm text-gray-400 p-6 text-center">No notifications yet</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                    !n.is_read ? 'bg-primary-50/40' : ''
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900">{n.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{formatDate(n.created_at)}</p>
                </button>
              ))
            )}
          </div>
          {user?.role === 'student' && (
            <div className="border-t border-gray-100 px-4 py-2">
              <Link
                href="/student"
                onClick={() => setOpen(false)}
                className="text-xs text-primary-600 hover:underline"
              >
                View promotions & recommendations →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
