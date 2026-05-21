'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner, EmptyState } from '@/components/ui/LoadingSpinner';
import { Course } from '@/types';
import { getErrorMessage } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, BookOpen, Users, ChevronRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { formatCurrency } from '@/lib/utils';

interface CourseForm {
  name: string;
  description: string;
  grade: string;
  price: number;
  currency: string;
}

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const { register, handleSubmit, reset } = useForm<CourseForm>();

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/courses');
      setCourses(data.data);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  async function onCreateCourse(formData: CourseForm) {
    setCreating(true);
    try {
      await api.post('/courses', formData);
      toast.success('Course created!');
      setShowCreate(false);
      reset();
      fetchCourses();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setCreating(false); }
  }

  return (
    <>
      <Header title="Course Management" subtitle="Manage all courses and their content" />
      <div className="p-8 space-y-6">

        <div className="flex justify-end">
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>New Course</Button>
        </div>

        {loading ? <LoadingSpinner /> : courses.length === 0 ? (
          <EmptyState title="No courses yet" description="Create your first course to get started." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {courses.map((c) => (
              <div key={c.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-primary-600" />
                  </div>
                  <Badge color={c.is_active ? 'green' : 'gray'}>{c.is_active ? 'Active' : 'Inactive'}</Badge>
                </div>
                <h3 className="font-semibold text-gray-900">{c.name}</h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{c.description || 'No description'}</p>

                <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{c.enrolled_count ?? 0} students</span>
                  <span className="font-semibold text-gray-700">{formatCurrency(c.price, c.currency)}</span>
                </div>

                <Link href={`/admin/courses/${c.id}`}
                  className="mt-4 flex items-center gap-1 text-primary-600 text-xs font-medium hover:text-primary-700 transition-colors">
                  Manage course <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={showCreate} onClose={() => { setShowCreate(false); reset(); }} title="Create Course">
        <form onSubmit={handleSubmit(onCreateCourse)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course Name *</label>
            <input {...register('name', { required: true })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea {...register('description')} rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
              <select {...register('grade')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="both">Grade 9 & 10</option>
                <option value="9">Grade 9 Only</option>
                <option value="10">Grade 10 Only</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select {...register('currency')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="AED">AED</option>
                <option value="USD">USD</option>
                <option value="INR">INR</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
            <input {...register('price')} type="number" min="0" step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={creating} className="flex-1">Create Course</Button>
            <Button type="button" variant="outline" onClick={() => { setShowCreate(false); reset(); }}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
