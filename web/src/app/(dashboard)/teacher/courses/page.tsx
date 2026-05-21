'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner, EmptyState } from '@/components/ui/LoadingSpinner';
import { getErrorMessage } from '@/lib/api';
import toast from 'react-hot-toast';
import { BookOpen, ChevronRight, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface CourseForm {
  name: string;
  description: string;
  grade: string;
  price: number;
  currency: string;
}

export default function TeacherCoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
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
      const { data } = await api.post('/courses', formData);
      toast.success('Course created!');
      setShowCreate(false);
      reset();
      fetchCourses();
      if (data.data?.id) {
        window.location.href = `/teacher/courses/${data.data.id}`;
      }
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setCreating(false); }
  }

  return (
    <>
      <Header title="My Courses" subtitle="Create and manage your courses">
        <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowCreate(true)}>
          New Course
        </Button>
      </Header>
      <div className="p-8">
        {loading ? <LoadingSpinner /> : courses.length === 0 ? (
          <EmptyState
            title="No courses yet"
            description="Create your first course, then add modules, materials, and quizzes."
            action={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>Create Course</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {courses.map((c) => (
              <div key={c.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center mb-3">
                  <BookOpen className="w-5 h-5 text-primary-600" />
                </div>
                <h3 className="font-semibold text-gray-900">{c.name}</h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{c.description || 'No description'}</p>
                <p className="text-xs text-gray-400 mt-2">{c.enrolled_count ?? 0} students enrolled</p>
                <Link href={`/teacher/courses/${c.id}`}
                  className="mt-4 flex items-center gap-1 text-primary-600 text-xs font-medium hover:text-primary-700">
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
                <option value="9">Grade 9</option>
                <option value="10">Grade 10</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
              <input {...register('price')} type="number" min="0" step="0.01" defaultValue={0}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={creating} className="flex-1">Create Course</Button>
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
