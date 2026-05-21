'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner, EmptyState } from '@/components/ui/LoadingSpinner';
import { getErrorMessage } from '@/lib/api';
import toast from 'react-hot-toast';

export default function TeacherStudentsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/teacher')
      .then((r) => setData(r.data.data))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <><Header title="My Students" /><LoadingSpinner /></>;

  return (
    <>
      <Header title="My Students" subtitle="Students in your assigned courses" />
      <div className="p-8 space-y-6">
        {data?.weakStudents?.length > 0 && (
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-5">
            <h3 className="font-semibold text-orange-700 mb-3">Students Needing Attention (score &lt; 50%)</h3>
            <div className="space-y-2">
              {data.weakStudents.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between bg-white rounded-lg p-3">
                  <div>
                    <p className="font-medium text-sm">{s.first_name} {s.last_name}</p>
                    <p className="text-xs text-gray-400">@{s.username} · {s.attempt_count} attempts</p>
                  </div>
                  <Badge color="red">Avg: {s.avg_score_pct}%</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Quiz Attempts</h3>
          {data?.recentAttempts?.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Student</th>
                  <th className="pb-2 font-medium">Quiz</th>
                  <th className="pb-2 font-medium">Score</th>
                  <th className="pb-2 font-medium">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.recentAttempts.map((a: any, i: number) => (
                  <tr key={i}>
                    <td className="py-2.5 font-medium">{a.first_name} {a.last_name}</td>
                    <td className="py-2.5 text-gray-500 text-xs truncate max-w-[200px]">{a.quiz_title}</td>
                    <td className="py-2.5">{a.score}/{a.max_score}</td>
                    <td className="py-2.5"><Badge color={a.is_passed ? 'green' : 'red'}>{a.is_passed ? 'Pass' : 'Fail'}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <EmptyState title="No quiz attempts yet" />}
        </div>
      </div>
    </>
  );
}
