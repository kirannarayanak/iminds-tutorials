'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { StatCard } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { getErrorMessage } from '@/lib/api';
import toast from 'react-hot-toast';
import { BookOpen, GraduationCap, Clock, Brain, AlertTriangle } from 'lucide-react';
import { formatTime } from '@/lib/utils';

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function TeacherDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/teacher')
      .then((r) => setData(r.data.data))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <><Header title="Dashboard" /><LoadingSpinner /></>;

  const totalStudents = data?.assignedCourses?.reduce((sum: number, c: any) => sum + (c.student_count || 0), 0) ?? 0;

  return (
    <>
      <Header title="Teacher Dashboard" subtitle="Your courses and student overview" />
      <div className="p-8 space-y-8">

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="My Courses" value={data?.assignedCourses?.length ?? 0} icon={<BookOpen className="w-5 h-5" />} color="bg-blue-50 text-blue-600" />
          <StatCard label="My Students" value={totalStudents} icon={<GraduationCap className="w-5 h-5" />} color="bg-green-50 text-green-600" />
          <StatCard label="Recent Attempts" value={data?.recentAttempts?.length ?? 0} icon={<Brain className="w-5 h-5" />} color="bg-purple-50 text-purple-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Assigned Courses */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="section-title mb-4 flex items-center gap-2"><BookOpen className="w-4 h-4" />My Courses</h2>
            {data?.assignedCourses?.length ? (
              <div className="space-y-2">
                {data.assignedCourses.map((c: any) => (
                  <Link key={c.id} href={`/teacher/courses/${c.id}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.student_count} students enrolled</p>
                    </div>
                    <span className="text-primary-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity">View →</span>
                  </Link>
                ))}
              </div>
            ) : <p className="text-sm text-gray-400">No courses assigned yet.</p>}
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
                      <div className="w-20 text-xs font-medium text-blue-600">{cl.day_of_week}</div>
                      <div className="flex-1 text-sm text-gray-700">{cl.course_name}</div>
                      <div className="text-xs text-gray-500">{formatTime(cl.start_time)} – {formatTime(cl.end_time)}</div>
                    </div>
                  ))}
              </div>
            ) : <p className="text-sm text-gray-400">No schedule yet.</p>}
          </div>

          {/* Weak Students */}
          {data?.weakStudents?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="section-title mb-4 flex items-center gap-2 text-orange-600"><AlertTriangle className="w-4 h-4" />Students Needing Attention</h2>
              <div className="space-y-2">
                {data.weakStudents.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{s.first_name} {s.last_name}</p>
                      <p className="text-xs text-gray-400">{s.attempt_count} attempts</p>
                    </div>
                    <Badge color="red">{s.avg_score_pct}%</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Quiz Attempts */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="section-title mb-4 flex items-center gap-2"><Brain className="w-4 h-4" />Recent Quiz Attempts</h2>
            {data?.recentAttempts?.length ? (
              <div className="space-y-2">
                {data.recentAttempts.map((a: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{a.first_name} {a.last_name}</p>
                      <p className="text-xs text-gray-400 truncate max-w-[180px]">{a.quiz_title}</p>
                    </div>
                    <Badge color={a.is_passed ? 'green' : 'red'}>
                      {a.score}/{a.max_score}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-400">No quiz attempts yet.</p>}
          </div>
        </div>
      </div>
    </>
  );
}
