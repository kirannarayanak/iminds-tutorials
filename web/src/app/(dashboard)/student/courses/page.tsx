'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner, EmptyState } from '@/components/ui/LoadingSpinner';
import { CourseCatalogInfo } from '@/components/courses/CourseCatalogInfo';
import { getErrorMessage, ensureValidToken } from '@/lib/api';
import toast from 'react-hot-toast';
import { BookOpen, ChevronRight, Clock, CreditCard } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function StudentCoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [tab, setTab] = useState<'browse' | 'mine'>('browse');

  const fetchCourses = () => {
    setLoading(true);
    api.get('/courses')
      .then((r) => setCourses(r.data.data))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCourses(); }, []);

  const enrolled = courses.filter((c) => c.is_enrolled);
  const catalog = courses.filter((c) => !c.is_enrolled);
  const shown = tab === 'browse' ? catalog : enrolled;

  async function payAndEnroll(course: { id: string; name: string; price: number; currency: string }) {
    const price = Number(course.price) || 0;
    const label = price <= 0
      ? `Enroll in "${course.name}" for free?`
      : `Pay ${formatCurrency(price, course.currency)} to enroll in "${course.name}"?`;

    if (!confirm(label)) return;

    const hasToken = await ensureValidToken();
    if (!hasToken) {
      toast.error('Your session expired. Please sign in again.');
      window.location.href = '/login';
      return;
    }

    setPayingId(course.id);
    try {
      const { data: initRes } = await api.post('/payments/initiate', { courseId: course.id });
      const init = initRes.data;

      if (init.enrolled || init.freeCourse) {
        toast.success(initRes.message || 'You are enrolled!');
        fetchCourses();
        setTab('mine');
        return;
      }

      if (init.isMock) {
        const { data: confirmRes } = await api.post('/payments/confirm', {
          paymentId: init.paymentId,
          gatewayTransactionId: init.gatewayTransactionId,
        });
        if (confirmRes.data.enrolled || confirmRes.data.status === 'paid') {
          toast.success(confirmRes.message || 'Payment successful! You are now enrolled.');
          fetchCourses();
          setTab('mine');
        } else {
          toast.error('Payment could not be completed.');
        }
      } else if (init.paymentUrl) {
        toast('Redirecting to payment gateway...');
        window.location.href = init.paymentUrl;
      } else {
        toast.error('Payment gateway not configured. Contact support.');
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPayingId(null);
    }
  }

  return (
    <>
      <Header title="Courses" subtitle="See who teaches each course, what's included, then pay to enroll" />
      <div className="p-8 space-y-6">
        <div className="flex gap-2 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setTab('browse')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'browse' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Browse ({catalog.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('mine')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'mine' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            My learning ({enrolled.length})
          </button>
        </div>

        {loading ? <LoadingSpinner /> : shown.length === 0 ? (
          <EmptyState
            title={tab === 'browse' ? 'No new courses' : 'No enrolled courses yet'}
            description={tab === 'browse' ? 'You are enrolled in all available courses.' : 'Browse the catalog and pay to enroll in a course.'}
          />
        ) : (
          <div className={tab === 'browse' ? 'space-y-6 max-w-3xl' : 'grid grid-cols-1 md:grid-cols-2 gap-4'}>
            {shown.map((c) => (
              <div key={c.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center shrink-0">
                      <BookOpen className="w-6 h-6 text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-900 text-lg">{c.name}</h3>
                        <div className="flex gap-1.5">
                          {c.is_enrolled && <Badge color="green">Enrolled</Badge>}
                          {c.has_pending_payment && !c.is_enrolled && (
                            <Badge color="yellow">Payment pending</Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{c.description || 'No description'}</p>
                      <p className="text-base font-semibold text-gray-900 mt-2">
                        {Number(c.price) > 0 ? formatCurrency(c.price, c.currency) : 'Free'}
                      </p>
                      {c.schedule_days?.filter(Boolean)?.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{c.schedule_days.filter(Boolean).join(' · ')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {tab === 'browse' && (
                    <div className="mt-5 pt-5 border-t border-gray-100">
                      <CourseCatalogInfo
                        creator={c.creator}
                        teachers={c.teachers}
                        modules={c.modules}
                        compact={false}
                      />
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap gap-2">
                    {c.is_enrolled ? (
                      <Link href={`/student/courses/${c.id}`}
                        className="inline-flex items-center gap-1 text-primary-600 text-sm font-medium hover:text-primary-700">
                        Continue learning <ChevronRight className="w-4 h-4" />
                      </Link>
                    ) : (
                      <>
                        <Link href={`/student/courses/${c.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
                          View full details
                        </Link>
                        <Button
                          size="sm"
                          loading={payingId === c.id}
                          icon={<CreditCard className="w-3.5 h-3.5" />}
                          onClick={() => payAndEnroll(c)}
                        >
                          {c.has_pending_payment
                            ? 'Complete payment'
                            : Number(c.price) > 0
                              ? 'Pay & enroll'
                              : 'Enroll free'}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
