'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { StatCard } from '@/components/ui/Card';
import { Badge, PaymentStatusBadge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { getErrorMessage } from '@/lib/api';
import toast from 'react-hot-toast';
import { BookOpen, Brain, Clock, CreditCard, CheckCircle2, AlertCircle, Sparkles, Tag } from 'lucide-react';
import { formatTime, formatDate } from '@/lib/utils';

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function StudentDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/student'),
      api.get('/notifications?unreadOnly=false'),
      api.get('/notifications/recommendations'),
    ])
      .then(([dash, notif, rec]) => {
        setData(dash.data.data);
        const items = notif.data.data?.items ?? [];
        setPromotions(
          items.filter((n: any) =>
            ['new_course', 'promotion'].includes(n.type) && !n.is_read
          ).slice(0, 5)
        );
        setRecommendations(rec.data.data ?? []);
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <><Header title="Dashboard" /><LoadingSpinner /></>;

  return (
    <>
      <Header title="My Dashboard" subtitle="Welcome back! Here's your learning overview." />
      <div className="p-8 space-y-8">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Enrolled Courses" value={data?.enrolledCourses?.length ?? 0} icon={<BookOpen className="w-5 h-5" />} color="bg-blue-50 text-blue-600" />
          <StatCard label="Pending Quizzes" value={data?.pendingQuizzes?.length ?? 0} icon={<Brain className="w-5 h-5" />} color="bg-orange-50 text-orange-600" />
          <StatCard label="Completed Quizzes" value={data?.completedQuizzes?.length ?? 0} icon={<CheckCircle2 className="w-5 h-5" />} color="bg-green-50 text-green-600" />
          <StatCard label="Classes / Week" value={data?.upcomingClasses?.length ?? 0} icon={<Clock className="w-5 h-5" />} color="bg-purple-50 text-purple-600" />
        </div>

        {(promotions.length > 0 || recommendations.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {promotions.length > 0 && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100 shadow-sm p-6 lg:col-span-2">
                <h2 className="section-title mb-4 flex items-center gap-2 text-amber-800">
                  <Tag className="w-4 h-4" /> New courses & promotions
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {promotions.map((n: any) => {
                    const meta = typeof n.metadata === 'string' ? JSON.parse(n.metadata) : n.metadata || {};
                    const courseId = meta.courseId || n.entity_id;
                    return (
                      <Link
                        key={n.id}
                        href={courseId ? `/student/courses/${courseId}` : '/student/courses'}
                        className="p-4 bg-white/80 hover:bg-white rounded-lg border border-amber-100 transition-colors"
                      >
                        <p className="font-semibold text-sm text-gray-900">{n.title}</p>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{n.message}</p>
                        {meta.discountPercent ? (
                          <span className="inline-block mt-2 text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                            {meta.discountPercent}% off — {meta.currency} {meta.promoPrice}
                          </span>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {recommendations.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 lg:col-span-2">
                <h2 className="section-title mb-4 flex items-center gap-2 text-primary-700">
                  <Sparkles className="w-4 h-4" /> Recommended for you
                </h2>
                <p className="text-xs text-gray-500 mb-4">Based on your enrolled courses — courses you have not joined yet.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {recommendations.map((c: any) => (
                    <Link
                      key={c.id}
                      href={`/student/courses/${c.id}`}
                      className="p-4 bg-gray-50 hover:bg-primary-50 rounded-lg border border-gray-100 transition-colors group"
                    >
                      <p className="font-medium text-sm group-hover:text-primary-700">{c.name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {(c.suggestionReasons || []).join(' · ')}
                      </p>
                      {c.discountPercent > 0 && (
                        <p className="text-xs font-semibold text-green-600 mt-2">
                          {c.discountPercent}% off — {c.currency} {c.promoPrice}{' '}
                          <span className="text-gray-400 line-through">{c.originalPrice}</span>
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
                <Link href="/student/courses" className="inline-block mt-4 text-sm text-primary-600 hover:underline">
                  Browse all courses →
                </Link>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* My Courses */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="section-title mb-4 flex items-center gap-2"><BookOpen className="w-4 h-4" />My Courses</h2>
            {data?.enrolledCourses?.length ? (
              <div className="space-y-2">
                {data.enrolledCourses.map((c: any) => (
                  <Link key={c.id} href={`/student/courses/${c.id}`}
                    className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group">
                    <div>
                      <p className="font-medium text-sm">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.module_count} modules</p>
                    </div>
                    <span className="text-primary-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity">Open →</span>
                  </Link>
                ))}
              </div>
            ) : <p className="text-sm text-gray-400">Not enrolled in any courses.</p>}
          </div>

          {/* Upcoming Classes */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="section-title mb-4 flex items-center gap-2"><Clock className="w-4 h-4" />Class Schedule</h2>
            {data?.upcomingClasses?.length ? (
              <div className="space-y-2">
                {data.upcomingClasses
                  .sort((a: any, b: any) => DAYS_ORDER.indexOf(a.day_of_week) - DAYS_ORDER.indexOf(b.day_of_week))
                  .map((cl: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                      <div className="w-20 text-xs font-semibold text-blue-700">{cl.day_of_week}</div>
                      <div className="flex-1 text-sm">{cl.course_name}</div>
                      <div className="text-xs text-gray-500">{formatTime(cl.start_time)}</div>
                    </div>
                  ))}
              </div>
            ) : <p className="text-sm text-gray-400">No schedule yet.</p>}
          </div>

          {/* Pending Quizzes */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="section-title mb-4 flex items-center gap-2 text-orange-600"><AlertCircle className="w-4 h-4" />Pending Quizzes</h2>
            {data?.pendingQuizzes?.length ? (
              <div className="space-y-2">
                {data.pendingQuizzes.map((q: any) => (
                  <Link key={q.id} href={`/student/quiz/${q.id}`}
                    className="flex items-center justify-between p-3 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors group">
                    <div>
                      <p className="font-medium text-sm">{q.title}</p>
                      <p className="text-xs text-gray-500">{q.course_name} · {q.module_title}</p>
                    </div>
                    <span className="text-orange-600 text-xs font-medium">Start →</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-gray-400">All quizzes completed!</p>
              </div>
            )}
          </div>

          {/* Recent Scores */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="section-title mb-4 flex items-center gap-2"><Brain className="w-4 h-4" />Recent Scores</h2>
            {data?.completedQuizzes?.length ? (
              <div className="space-y-2">
                {data.completedQuizzes.map((q: any) => {
                  const pct = Math.round((q.score / q.max_score) * 100);
                  return (
                    <div key={q.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium truncate">{q.quiz_title}</p>
                        <p className="text-xs text-gray-400">{q.course_name} · {formatDate(q.submitted_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-sm ${pct >= 60 ? 'text-green-600' : 'text-red-500'}`}>{pct}%</p>
                        <Badge color={q.is_passed ? 'green' : 'red'}>{q.is_passed ? 'Pass' : 'Fail'}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <p className="text-sm text-gray-400">No quiz attempts yet.</p>}
          </div>

          {/* Payments */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 lg:col-span-2">
            <h2 className="section-title mb-4 flex items-center gap-2"><CreditCard className="w-4 h-4" />My Payments</h2>
            {data?.paymentStatus?.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.paymentStatus.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{p.course_name}</p>
                      <p className="text-xs text-gray-400">{p.currency} {p.amount}</p>
                    </div>
                    <PaymentStatusBadge status={p.status} />
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-400">No payment records.</p>}
          </div>
        </div>
      </div>
    </>
  );
}
