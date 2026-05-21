'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner, EmptyState } from '@/components/ui/LoadingSpinner';
import { getErrorMessage } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Users, CalendarCheck, Search, CheckCircle2, XCircle, Clock,
} from 'lucide-react';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';

type Tab = 'enrollments' | 'attendance';

function PaymentBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: 'green' | 'yellow' | 'red' | 'blue' | 'gray' }> = {
    paid: { label: 'Paid', color: 'green' },
    free: { label: 'Free course', color: 'blue' },
    pending: { label: 'Pending', color: 'yellow' },
    unpaid: { label: 'Not paid', color: 'red' },
  };
  const s = map[status] || { label: status, color: 'gray' as const };
  return <Badge color={s.color}>{s.label}</Badge>;
}

export default function AdminDatabasePage() {
  const [tab, setTab] = useState<Tab>('enrollments');

  // Enrollments state
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [enrollSearch, setEnrollSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [courses, setCourses] = useState<any[]>([]);

  // Attendance state
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [attendanceCourseId, setAttendanceCourseId] = useState('');
  const [marking, setMarking] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/courses').then((r) => setCourses(r.data.data || [])).catch(() => {});
  }, []);

  const fetchEnrollments = useCallback(async () => {
    const params = new URLSearchParams();
    if (enrollSearch) params.set('search', enrollSearch);
    if (paymentFilter) params.set('paymentStatus', paymentFilter);
    if (courseFilter) params.set('courseId', courseFilter);
    const { data } = await api.get(`/database/enrollments?${params}`);
    setEnrollments(data.data.items);
    setSummary(data.data.summary);
  }, [enrollSearch, paymentFilter, courseFilter]);

  const fetchAttendance = useCallback(async () => {
    const params = new URLSearchParams({ date: attendanceDate });
    if (attendanceCourseId) params.set('courseId', attendanceCourseId);
    const { data } = await api.get(`/database/attendance?${params}`);
    setAttendanceData(data.data);
  }, [attendanceDate, attendanceCourseId]);

  useEffect(() => {
    setLoading(true);
    const load = tab === 'enrollments' ? fetchEnrollments() : fetchAttendance();
    load.catch((err) => toast.error(getErrorMessage(err))).finally(() => setLoading(false));
  }, [tab, fetchEnrollments, fetchAttendance]);

  async function toggleAttendance(
    studentId: string,
    courseId: string,
    currentStatus: string | null
  ) {
    const key = `${studentId}-${courseId}`;
    setMarking(key);
    try {
      if (currentStatus === 'present') {
        await api.delete('/database/attendance', {
          data: { studentId, courseId, date: attendanceDate },
        });
        toast.success('Attendance cleared');
      } else {
        await api.post('/database/attendance', {
          studentId,
          courseId,
          date: attendanceDate,
          status: 'present',
        });
        toast.success('Marked present');
      }
      await fetchAttendance();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setMarking(null);
    }
  }

  async function markAbsent(studentId: string, courseId: string) {
    const key = `${studentId}-${courseId}`;
    setMarking(key);
    try {
      await api.post('/database/attendance', {
        studentId,
        courseId,
        date: attendanceDate,
        status: 'absent',
      });
      toast.success('Marked absent');
      await fetchAttendance();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setMarking(null);
    }
  }

  return (
    <>
      <Header
        title="Database"
        subtitle="Student enrollments, payment status, and daily class attendance"
      />
      <div className="p-8 space-y-6">

        <div className="flex gap-2 border-b border-gray-100">
          <button
            type="button"
            onClick={() => setTab('enrollments')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === 'enrollments'
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Users className="w-4 h-4" />
            Enrollments & payments
          </button>
          <button
            type="button"
            onClick={() => setTab('attendance')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === 'attendance'
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            Class attendance
          </button>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : tab === 'enrollments' ? (
          <>
            {summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white border border-gray-100 rounded-lg p-4">
                  <p className="text-xs text-gray-500">Total enrollments</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                  <p className="text-xs text-green-700">Paid / Free</p>
                  <p className="text-2xl font-bold text-green-800">{summary.paid}</p>
                </div>
                <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4">
                  <p className="text-xs text-yellow-700">Pending payment</p>
                  <p className="text-2xl font-bold text-yellow-800">{summary.pending}</p>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                  <p className="text-xs text-red-700">Not paid</p>
                  <p className="text-2xl font-bold text-red-800">{summary.unpaid}</p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  className="input pl-9 w-full"
                  placeholder="Search student name or email..."
                  value={enrollSearch}
                  onChange={(e) => setEnrollSearch(e.target.value)}
                />
              </div>
              <select
                className="input w-auto"
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
              >
                <option value="">All courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select
                className="input w-auto"
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
              >
                <option value="">All payment statuses</option>
                <option value="paid">Paid</option>
                <option value="free">Free</option>
                <option value="pending">Pending</option>
                <option value="unpaid">Not paid</option>
              </select>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {enrollments.length === 0 ? (
                <EmptyState title="No enrollments found" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-6 py-3 font-medium text-gray-500">Student</th>
                        <th className="text-left px-6 py-3 font-medium text-gray-500">Email</th>
                        <th className="text-left px-6 py-3 font-medium text-gray-500">Grade</th>
                        <th className="text-left px-6 py-3 font-medium text-gray-500">Course</th>
                        <th className="text-left px-6 py-3 font-medium text-gray-500">Enrolled</th>
                        <th className="text-left px-6 py-3 font-medium text-gray-500">Payment</th>
                        <th className="text-left px-6 py-3 font-medium text-gray-500">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {enrollments.map((row) => (
                        <tr key={row.enrollment_id} className="hover:bg-gray-50">
                          <td className="px-6 py-3 font-medium">
                            {row.first_name} {row.last_name}
                          </td>
                          <td className="px-6 py-3 text-gray-600">{row.email || row.username}</td>
                          <td className="px-6 py-3 text-gray-500">{row.grade || '—'}</td>
                          <td className="px-6 py-3">{row.course_name}</td>
                          <td className="px-6 py-3 text-gray-400 text-xs">
                            {formatDate(row.enrolled_at)}
                          </td>
                          <td className="px-6 py-3">
                            <PaymentBadge status={row.payment_status} />
                          </td>
                          <td className="px-6 py-3 text-gray-600">
                            {row.payment_status === 'paid' && row.paid_amount != null
                              ? formatCurrency(row.paid_amount, row.currency)
                              : row.payment_status === 'free'
                                ? '—'
                                : formatCurrency(row.course_price, row.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-4 bg-white border border-gray-100 rounded-xl p-4">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Date</label>
                <input
                  type="date"
                  className="input"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Course (optional)</label>
                <select
                  className="input min-w-[200px]"
                  value={attendanceCourseId}
                  onChange={(e) => setAttendanceCourseId(e.target.value)}
                >
                  <option value="">All classes today</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              {attendanceData && (
                <p className="text-sm text-gray-600 pb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  {attendanceData.dayOfWeek}
                  {!attendanceData.hasScheduledClasses && (
                    <span className="text-amber-600 ml-2">No classes scheduled this day</span>
                  )}
                </p>
              )}
            </div>

            {attendanceData?.attendedToday?.length > 0 && (
              <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Attended today ({attendanceData.attendedToday.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {attendanceData.attendedToday.map((a: any) => (
                    <span
                      key={a.id}
                      className="text-xs bg-white px-2 py-1 rounded border border-green-200 text-green-800"
                    >
                      {a.first_name} {a.last_name} — {a.course_name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {!attendanceData?.courses?.length ? (
              <EmptyState
                title="No classes for this day"
                description="Pick another date or select a course to mark attendance manually."
              />
            ) : (
              <div className="space-y-6">
                {attendanceData.courses.map((course: any) => (
                  <div
                    key={course.id}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
                  >
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">{course.name}</h3>
                        {course.schedules?.length > 0 && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {course.schedules.map((s: any) =>
                              `${s.day_of_week} ${formatTime(s.start_time)}–${formatTime(s.end_time)}`
                            ).join(' · ')}
                          </p>
                        )}
                      </div>
                      <span className="text-sm text-gray-600">
                        Present: <strong>{course.presentCount}</strong> / {course.totalEnrolled}
                      </span>
                    </div>

                    {course.students.length === 0 ? (
                      <p className="text-sm text-gray-400 p-6">No students enrolled.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead className="border-b border-gray-50">
                          <tr>
                            <th className="text-left px-6 py-2 font-medium text-gray-500">Student</th>
                            <th className="text-left px-6 py-2 font-medium text-gray-500">Grade</th>
                            <th className="text-left px-6 py-2 font-medium text-gray-500">Status</th>
                            <th className="text-left px-6 py-2 font-medium text-gray-500">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {course.students.map((s: any) => {
                            const key = `${s.student_id}-${course.id}`;
                            const isPresent = s.attendance_status === 'present';
                            const isAbsent = s.attendance_status === 'absent';
                            return (
                              <tr key={s.student_id} className="hover:bg-gray-50">
                                <td className="px-6 py-3 font-medium">
                                  {s.first_name} {s.last_name}
                                  <p className="text-xs text-gray-400 font-normal">{s.email}</p>
                                </td>
                                <td className="px-6 py-3 text-gray-500">{s.grade || '—'}</td>
                                <td className="px-6 py-3">
                                  {isPresent ? (
                                    <Badge color="green">Present</Badge>
                                  ) : isAbsent ? (
                                    <Badge color="red">Absent</Badge>
                                  ) : (
                                    <Badge color="gray">Not marked</Badge>
                                  )}
                                  {s.attendance_marked_at && (
                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                      {formatDate(s.attendance_marked_at)}
                                    </p>
                                  )}
                                </td>
                                <td className="px-6 py-3 flex gap-2">
                                  <Button
                                    size="sm"
                                    variant={isPresent ? 'secondary' : 'primary'}
                                    disabled={marking === key}
                                    onClick={() =>
                                      toggleAttendance(s.student_id, course.id, s.attendance_status)
                                    }
                                  >
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    {isPresent ? 'Undo' : 'Present'}
                                  </Button>
                                  {!isAbsent && (
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      disabled={marking === key}
                                      onClick={() => markAbsent(s.student_id, course.id)}
                                    >
                                      <XCircle className="w-3 h-3 mr-1" />
                                      Absent
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
