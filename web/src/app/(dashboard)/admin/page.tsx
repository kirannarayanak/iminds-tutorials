'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { StatCard } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Users, BookOpen, Brain, CreditCard, TrendingUp,
  GraduationCap, CheckCircle, AlertCircle
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/admin').then((r) => setData(r.data.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <><Header title="Dashboard" /><LoadingSpinner /></>;

  return (
    <>
      <Header title="Admin Dashboard" subtitle="iMinds Tutorials overview" />
      <div className="p-8 space-y-8">

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Students" value={data?.totalStudents ?? 0} icon={<GraduationCap className="w-5 h-5" />} color="bg-blue-50 text-blue-600" />
          <StatCard label="Total Teachers" value={data?.totalTeachers ?? 0} icon={<Users className="w-5 h-5" />} color="bg-purple-50 text-purple-600" />
          <StatCard label="Total Courses" value={data?.totalCourses ?? 0} icon={<BookOpen className="w-5 h-5" />} color="bg-green-50 text-green-600" subtitle={`${data?.activeCourses ?? 0} active`} />
          <StatCard label="Quiz Attempts" value={data?.quizStats?.total_attempts ?? 0} icon={<Brain className="w-5 h-5" />} color="bg-orange-50 text-orange-600" subtitle={`Avg: ${data?.quizStats?.avg_score_pct ?? 0}%`} />
        </div>

        {/* Payment + Quiz summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="section-title mb-4 flex items-center gap-2"><CreditCard className="w-4 h-4" />Payment Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm text-gray-600">Total Revenue</span>
                <span className="font-bold text-green-600">{formatCurrency(data?.paymentStats?.total_revenue ?? 0)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm text-gray-600 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-green-500" />Paid</span>
                <span className="font-semibold">{data?.paymentStats?.paid_count ?? 0}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5 text-yellow-500" />Pending</span>
                <span className="font-semibold">{data?.paymentStats?.pending_count ?? 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="section-title mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4" />Course Scores</h2>
            {data?.courseScores?.length ? (
              <div className="space-y-3">
                {data.courseScores.map((cs: any) => (
                  <div key={cs.course_name} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 w-20 truncate">{cs.course_name}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className="bg-primary-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(cs.avg_score_pct || 0, 100)}%` }} />
                    </div>
                    <span className="text-sm font-semibold text-gray-700 w-12 text-right">{cs.avg_score_pct ?? 0}%</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-400">No quiz data yet</p>}
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="section-title mb-4">Recent Student Activity</h2>
          {data?.recentActivity?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th className="pb-2 font-medium">Student</th>
                    <th className="pb-2 font-medium">Quiz</th>
                    <th className="pb-2 font-medium">Score</th>
                    <th className="pb-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.recentActivity.map((a: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="py-2.5 font-medium">{a.first_name} {a.last_name}</td>
                      <td className="py-2.5 text-gray-600 truncate max-w-[200px]">{a.quiz_title}</td>
                      <td className="py-2.5">
                        <span className={`font-semibold ${(a.score / a.max_score) >= 0.6 ? 'text-green-600' : 'text-red-500'}`}>
                          {a.score}/{a.max_score}
                        </span>
                      </td>
                      <td className="py-2.5 text-gray-400">{formatDate(a.submitted_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-sm text-gray-400">No quiz submissions yet.</p>}
        </div>
      </div>
    </>
  );
}
