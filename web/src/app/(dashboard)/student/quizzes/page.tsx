'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner, EmptyState } from '@/components/ui/LoadingSpinner';
import { getErrorMessage } from '@/lib/api';
import toast from 'react-hot-toast';
import { Brain, CheckCircle2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function StudentQuizzesPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/student')
      .then((r) => setData(r.data.data))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <><Header title="Quizzes" /><LoadingSpinner /></>;

  return (
    <>
      <Header title="My Quizzes" subtitle="Pending and completed quiz attempts" />
      <div className="p-8 space-y-8">

        {/* Pending */}
        <div>
          <h2 className="section-title mb-4 flex items-center gap-2 text-orange-600">
            <Brain className="w-4 h-4" /> Pending Quizzes ({data?.pendingQuizzes?.length ?? 0})
          </h2>
          {data?.pendingQuizzes?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.pendingQuizzes.map((q: any) => (
                <div key={q.id} className="bg-white rounded-xl border border-orange-100 shadow-sm p-5">
                  <p className="font-semibold text-gray-900">{q.title}</p>
                  <p className="text-sm text-gray-500 mt-1">{q.course_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{q.module_title}</p>
                  <Link href={`/student/quiz/${q.id}`}
                    className="mt-4 inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors">
                    Start Quiz →
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-green-50 text-green-700 px-4 py-3 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-medium">All quizzes completed!</span>
            </div>
          )}
        </div>

        {/* Completed */}
        <div>
          <h2 className="section-title mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" /> Completed ({data?.completedQuizzes?.length ?? 0})
          </h2>
          {data?.completedQuizzes?.length ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Quiz</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Course</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Score</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Date</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.completedQuizzes.map((q: any) => {
                    const pct = Math.round((q.score / q.max_score) * 100);
                    return (
                      <tr key={q.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 font-medium truncate max-w-[180px]">{q.quiz_title}</td>
                        <td className="px-6 py-3 text-gray-500">{q.course_name}</td>
                        <td className="px-6 py-3">
                          <span className={`font-semibold ${pct >= 60 ? 'text-green-600' : 'text-red-500'}`}>{pct}%</span>
                          <span className="text-gray-400 ml-1 text-xs">({q.score}/{q.max_score})</span>
                        </td>
                        <td className="px-6 py-3 text-gray-400 text-xs">{formatDate(q.submitted_at)}</td>
                        <td className="px-6 py-3"><Badge color={q.is_passed ? 'green' : 'red'}>{q.is_passed ? 'Pass' : 'Fail'}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <EmptyState title="No completed quizzes" description="Attempt quizzes from your course modules." />}
        </div>
      </div>
    </>
  );
}
