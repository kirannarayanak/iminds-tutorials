'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { CourseCatalogInfo } from '@/components/courses/CourseCatalogInfo';
import { Course, Module } from '@/types';
import { getErrorMessage, ensureValidToken } from '@/lib/api';
import toast from 'react-hot-toast';
import { FileText, Video, Brain, Download, ChevronDown, ChevronUp, ExternalLink, CreditCard, Lock, ArrowLeft } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function StudentCourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [moduleDetail, setModuleDetail] = useState<Record<string, any>>({});
  const [loadingModule, setLoadingModule] = useState<string | null>(null);

  const fetchCourse = useCallback(() => {
    setLoading(true);
    api.get(`/courses/${id}`)
      .then((r) => setCourse(r.data.data))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { fetchCourse(); }, [fetchCourse]);

  const isPreview = Boolean(course?.preview);

  async function payAndEnroll() {
    if (!course) return;
    const price = Number(course.price) || 0;
    const label = price <= 0
      ? `Enroll in "${course.name}" for free?`
      : `Pay ${formatCurrency(price, course.currency)} to enroll?`;
    if (!confirm(label)) return;

    const hasToken = await ensureValidToken();
    if (!hasToken) {
      toast.error('Your session expired. Please sign in again.');
      window.location.href = '/login';
      return;
    }

    setPaying(true);
    try {
      const { data: initRes } = await api.post('/payments/initiate', { courseId: course.id });
      const init = initRes.data;
      if (init.enrolled || init.freeCourse) {
        toast.success('You are enrolled!');
        fetchCourse();
        return;
      }
      if (init.isMock) {
        const { data: confirmRes } = await api.post('/payments/confirm', {
          paymentId: init.paymentId,
          gatewayTransactionId: init.gatewayTransactionId,
        });
        if (confirmRes.data.enrolled || confirmRes.data.status === 'paid') {
          toast.success(confirmRes.message || 'Payment successful!');
          fetchCourse();
        }
      } else if (init.paymentUrl) {
        window.location.href = init.paymentUrl;
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPaying(false);
    }
  }

  async function loadModuleDetail(moduleId: string) {
    if (isPreview || moduleDetail[moduleId]) return;
    setLoadingModule(moduleId);
    try {
      const { data } = await api.get(`/modules/${moduleId}`);
      setModuleDetail((prev) => ({ ...prev, [moduleId]: data.data }));
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoadingModule(null); }
  }

  function toggleModule(moduleId: string) {
    if (isPreview) return;
    if (expandedModule === moduleId) {
      setExpandedModule(null);
    } else {
      setExpandedModule(moduleId);
      loadModuleDetail(moduleId);
    }
  }

  if (loading) return <><Header title="Course" /><LoadingSpinner /></>;
  if (!course) return <Header title="Course not found" />;

  return (
    <>
      <Header title={course.name} subtitle={course.description || undefined}>
        <Link href="/student/courses" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mr-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
      </Header>
      <div className="p-8 space-y-6 max-w-3xl">

        {isPreview && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">Preview mode</p>
                <p className="text-sm text-amber-800 mt-0.5">
                  Pay to enroll and unlock lessons, materials, and quizzes.
                </p>
                <p className="text-lg font-bold text-gray-900 mt-2">
                  {Number(course.price) > 0 ? formatCurrency(course.price, course.currency) : 'Free'}
                </p>
              </div>
            </div>
            <Button loading={paying} icon={<CreditCard className="w-4 h-4" />} onClick={payAndEnroll}>
              {course.has_pending_payment ? 'Complete payment' : Number(course.price) > 0 ? 'Pay & enroll' : 'Enroll free'}
            </Button>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">About this course</h2>
          <CourseCatalogInfo
            creator={course.creator}
            teachers={course.teachers}
            modules={course.modules}
          />
        </div>

        {!isPreview && course.modules?.map((m: Module) => {
          const detail = moduleDetail[m.id];
          const isExpanded = expandedModule === m.id;
          return (
            <div key={m.id} className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div
                className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleModule(m.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary-50 text-primary-700 rounded-lg flex items-center justify-center text-sm font-bold">
                    {(m.order_index ?? 0) + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{m.title}</p>
                    <div className="flex gap-2 mt-0.5">
                      {(m.materials_count ?? 0) > 0 && <span className="text-xs text-gray-400">{m.materials_count} materials</span>}
                      {(m.quiz_count ?? 0) > 0 && <Badge color="blue" className="text-xs">Quiz</Badge>}
                    </div>
                  </div>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>

              {isExpanded && (
                <div className="border-t border-gray-100 p-5 space-y-6">
                  {loadingModule === m.id && <LoadingSpinner label="Loading module..." />}
                  {detail && (
                    <>
                      {detail.text_content && (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <FileText className="w-4 h-4" /> Lesson Content
                          </h3>
                          <div className="prose prose-sm max-w-none bg-gray-50 rounded-lg p-4">
                            <pre className="whitespace-pre-wrap font-sans text-gray-700 text-sm leading-relaxed">{detail.text_content}</pre>
                          </div>
                        </div>
                      )}
                      {detail.video?.video_url && (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <Video className="w-4 h-4" /> Video
                          </h3>
                          <a href={detail.video.video_url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-primary-600 text-sm font-medium">
                            <ExternalLink className="w-4 h-4" /> Watch video
                          </a>
                        </div>
                      )}
                      {detail.materials?.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <Download className="w-4 h-4" /> Materials
                          </h3>
                          <div className="space-y-2">
                            {detail.materials.map((mat: any) => (
                              <div key={mat.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                                <p className="text-sm font-medium">{mat.title}</p>
                                {mat.signedUrl && (
                                  <a href={mat.signedUrl} target="_blank" rel="noopener noreferrer" download
                                    className="text-primary-600 text-xs font-medium">Download</a>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {detail.quiz && (
                        <div className="bg-orange-50 rounded-lg p-4 flex items-center justify-between">
                          <div>
                            <p className="font-semibold flex items-center gap-2"><Brain className="w-4 h-4" />{detail.quiz.title}</p>
                          </div>
                          <Link href={`/student/quiz/${detail.quiz.id}`}
                            className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg">
                            Attempt Quiz
                          </Link>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {isPreview && (course.modules?.length ?? 0) > 0 && (
          <p className="text-center text-sm text-gray-400 pb-4">
            Module lessons unlock after you enroll.
          </p>
        )}

        {!course.modules?.length && (
          <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center text-gray-400">
            No modules in this course yet.
          </div>
        )}
      </div>
    </>
  );
}
