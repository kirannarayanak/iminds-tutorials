'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Course, Module } from '@/types';
import { getErrorMessage } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Clock, BookOpen, GraduationCap, Pencil, X, Trash2, Users } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { formatTime } from '@/lib/utils';

interface ModuleForm { title: string; description: string; }
interface ModuleEditForm { title: string; description: string; isPublished: boolean; }
interface TeacherForm { teacherId: string; }
interface EnrollForm { studentId: string; }
interface CourseEditForm {
  name: string;
  description: string;
  grade: string;
  price: number;
  currency: string;
  isActive: boolean;
}

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModule, setShowAddModule] = useState(false);
  const [showAssignTeacher, setShowAssignTeacher] = useState(false);
  const [showEditCourse, setShowEditCourse] = useState(false);
  const [showEnrollStudent, setShowEnrollStudent] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const moduleForm = useForm<ModuleForm>();
  const moduleEditForm = useForm<ModuleEditForm>();
  const teacherForm = useForm<TeacherForm>();
  const enrollForm = useForm<EnrollForm>();
  const courseEditForm = useForm<CourseEditForm>();

  const fetchCourse = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/courses/${id}`);
      setCourse(data.data);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => {
    fetchCourse();
    api.get('/users?role=teacher&limit=100').then(r => setTeachers(r.data.data));
    api.get('/users?role=student&limit=500').then(r => setAllStudents(r.data.data));
  }, [fetchCourse]);

  function openEditCourse() {
    if (!course) return;
    courseEditForm.reset({
      name: course.name,
      description: course.description || '',
      grade: course.grade || 'both',
      price: course.price,
      currency: course.currency,
      isActive: course.is_active,
    });
    setShowEditCourse(true);
  }

  async function saveCourseEdit(data: CourseEditForm) {
    setSaving(true);
    try {
      await api.put(`/courses/${id}`, {
        name: data.name,
        description: data.description,
        grade: data.grade,
        price: Number(data.price),
        currency: data.currency,
        isActive: data.isActive,
      });
      toast.success('Course updated');
      setShowEditCourse(false);
      fetchCourse();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  }

  async function addModule(data: ModuleForm) {
    setSaving(true);
    try {
      await api.post('/modules', { courseId: id, title: data.title, description: data.description });
      toast.success('Module added');
      setShowAddModule(false);
      moduleForm.reset();
      fetchCourse();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  }

  function openEditModule(m: Module) {
    moduleEditForm.reset({
      title: m.title,
      description: m.description || '',
      isPublished: m.is_published,
    });
    setEditingModule(m);
  }

  async function saveModuleEdit(data: ModuleEditForm) {
    if (!editingModule) return;
    setSaving(true);
    try {
      await api.put(`/modules/${editingModule.id}`, {
        title: data.title,
        description: data.description,
        isPublished: data.isPublished,
      });
      toast.success('Module updated');
      setEditingModule(null);
      fetchCourse();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  }

  async function deleteModule(m: Module) {
    if (!confirm(`Delete module "${m.title}"? This will remove all materials, videos, and quizzes inside it.`)) return;
    try {
      await api.delete(`/modules/${m.id}`);
      toast.success('Module deleted');
      fetchCourse();
    } catch (err) { toast.error(getErrorMessage(err)); }
  }

  async function assignTeacher(data: TeacherForm) {
    setSaving(true);
    try {
      await api.post(`/courses/${id}/assign-teacher`, { teacherId: data.teacherId });
      toast.success('Teacher assigned');
      setShowAssignTeacher(false);
      teacherForm.reset();
      fetchCourse();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  }

  async function removeTeacher(teacherId: string, name: string) {
    if (!confirm(`Remove ${name} from this course?`)) return;
    try {
      await api.delete(`/courses/${id}/teachers/${teacherId}`);
      toast.success('Teacher removed');
      fetchCourse();
    } catch (err) { toast.error(getErrorMessage(err)); }
  }

  async function enrollStudent(data: EnrollForm) {
    setSaving(true);
    try {
      await api.post(`/courses/${id}/enroll`, { studentId: data.studentId });
      toast.success('Student enrolled');
      setShowEnrollStudent(false);
      enrollForm.reset();
      fetchCourse();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  }

  async function unenrollStudent(studentId: string, name: string) {
    if (!confirm(`Unenroll ${name} from this course?`)) return;
    try {
      await api.delete(`/courses/${id}/enroll/${studentId}`);
      toast.success('Student unenrolled');
      fetchCourse();
    } catch (err) { toast.error(getErrorMessage(err)); }
  }

  if (loading) return <><Header title="Course" /><LoadingSpinner /></>;
  if (!course) return <Header title="Course not found" />;

  return (
    <>
      <Header title={course.name} subtitle={course.description || undefined}>
        <Button size="sm" variant="outline" icon={<Pencil className="w-3.5 h-3.5" />} onClick={openEditCourse}>
          Edit Course
        </Button>
      </Header>
      <div className="p-8 space-y-6">

        {/* Info row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-400">Enrolled Students</p>
            <p className="text-2xl font-bold mt-1">{course.enrolled_count ?? 0}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-400">Modules</p>
            <p className="text-2xl font-bold mt-1">{course.modules?.length ?? 0}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-400">Status</p>
            <div className="mt-1"><Badge color={course.is_active ? 'green' : 'gray'}>{course.is_active ? 'Active' : 'Inactive'}</Badge></div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-400">Grade</p>
            <p className="text-lg font-bold mt-1 capitalize">{course.grade === 'both' ? 'Grade 9 & 10' : `Grade ${course.grade}`}</p>
          </div>
        </div>

        {/* Schedules */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="section-title mb-4 flex items-center gap-2"><Clock className="w-4 h-4" />Class Schedule</h2>
          {course.schedules?.length ? (
            <div className="flex flex-wrap gap-3">
              {course.schedules.map((s: any) => (
                <div key={s.id} className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm">
                  <span className="font-medium">{s.day_of_week}</span>
                  <span className="ml-2 text-blue-500">{formatTime(s.start_time)} – {formatTime(s.end_time)}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400">No schedule set</p>}
        </div>

        {/* Teachers */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title flex items-center gap-2"><GraduationCap className="w-4 h-4" />Assigned Teachers</h2>
            <Button size="sm" variant="outline" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowAssignTeacher(true)}>Assign</Button>
          </div>
          {course.teachers?.length ? (
            <div className="flex flex-wrap gap-2">
              {course.teachers.map((t: any) => (
                <div key={t.id} className="bg-gray-50 rounded-lg pl-3 pr-1 py-1 text-sm font-medium text-gray-700 flex items-center gap-1">
                  <span className="py-1">{t.first_name} {t.last_name}</span>
                  <button
                    type="button"
                    onClick={() => removeTeacher(t.id, `${t.first_name} ${t.last_name}`)}
                    title="Remove from course"
                    className="ml-1 p-1 rounded-md hover:bg-red-50 hover:text-red-600 text-gray-400 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400">No teacher assigned</p>}
        </div>

        {/* Enrolled Students */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title flex items-center gap-2">
              <Users className="w-4 h-4" />Enrolled Students
              <span className="ml-1 text-xs font-normal text-gray-400">({(course as any).enrolledStudents?.length ?? course.enrolled_count ?? 0})</span>
            </h2>
            <Button size="sm" variant="outline" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowEnrollStudent(true)}>Enroll Student</Button>
          </div>
          {(course as any).enrolledStudents?.length ? (
            <div className="divide-y divide-gray-50">
              {(course as any).enrolledStudents.map((s: any) => (
                <div key={s.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {s.first_name?.[0]}{s.last_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{s.first_name} {s.last_name}</p>
                    <p className="text-xs text-gray-400">@{s.username}{s.grade ? ` · Grade ${s.grade}` : ''}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => unenrollStudent(s.id, `${s.first_name} ${s.last_name}`)}
                    title="Unenroll student"
                    className="p-1.5 rounded-md hover:bg-red-50 hover:text-red-600 text-gray-400 transition-colors flex-shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No students enrolled yet.</p>
          )}
        </div>

        {/* Modules */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title flex items-center gap-2"><BookOpen className="w-4 h-4" />Modules</h2>
            <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowAddModule(true)}>Add Module</Button>
          </div>
          {course.modules?.length ? (
            <div className="space-y-2">
              {course.modules.map((m: Module, i: number) => (
                <div key={m.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="w-7 h-7 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{m.title}</p>
                    <p className="text-xs text-gray-400">{m.materials_count ?? 0} materials · {m.quiz_count ?? 0} quiz</p>
                  </div>
                  <Badge color={m.is_published ? 'green' : 'yellow'}>{m.is_published ? 'Published' : 'Draft'}</Badge>
                  <button
                    type="button"
                    onClick={() => openEditModule(m)}
                    title="Edit module"
                    className="p-1.5 rounded-md hover:bg-white text-gray-500 hover:text-primary-600 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteModule(m)}
                    title="Delete module"
                    className="p-1.5 rounded-md hover:bg-white text-gray-500 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400">No modules yet. Add your first module.</p>}
        </div>
      </div>

      {/* Edit Course Modal */}
      <Modal open={showEditCourse} onClose={() => setShowEditCourse(false)} title="Edit Course">
        <form onSubmit={courseEditForm.handleSubmit(saveCourseEdit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course Name *</label>
            <input {...courseEditForm.register('name', { required: true })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea {...courseEditForm.register('description')} rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
              <select {...courseEditForm.register('grade')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="both">Grade 9 & 10</option>
                <option value="9">Grade 9 Only</option>
                <option value="10">Grade 10 Only</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select {...courseEditForm.register('currency')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="AED">AED</option>
                <option value="USD">USD</option>
                <option value="INR">INR</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
            <input {...courseEditForm.register('price')} type="number" min="0" step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" {...courseEditForm.register('isActive')} className="w-4 h-4 rounded border-gray-300 text-primary-600" />
            Course is active
          </label>
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={saving} className="flex-1">Save Changes</Button>
            <Button type="button" variant="outline" onClick={() => setShowEditCourse(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>

      {/* Add Module Modal */}
      <Modal open={showAddModule} onClose={() => { setShowAddModule(false); moduleForm.reset(); }} title="Add Module" size="sm">
        <form onSubmit={moduleForm.handleSubmit(addModule)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Module Title *</label>
            <input {...moduleForm.register('title', { required: true })} placeholder="e.g. Module 1: Introduction to..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea {...moduleForm.register('description')} rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="flex gap-3">
            <Button type="submit" loading={saving} className="flex-1">Add Module</Button>
            <Button type="button" variant="outline" onClick={() => setShowAddModule(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Module Modal */}
      <Modal open={!!editingModule} onClose={() => setEditingModule(null)} title="Edit Module" size="sm">
        <form onSubmit={moduleEditForm.handleSubmit(saveModuleEdit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Module Title *</label>
            <input {...moduleEditForm.register('title', { required: true })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea {...moduleEditForm.register('description')} rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" {...moduleEditForm.register('isPublished')} className="w-4 h-4 rounded border-gray-300 text-primary-600" />
            Published
          </label>
          <div className="flex gap-3">
            <Button type="submit" loading={saving} className="flex-1">Save Changes</Button>
            <Button type="button" variant="outline" onClick={() => setEditingModule(null)}>Cancel</Button>
          </div>
        </form>
      </Modal>

      {/* Enroll Student Modal */}
      <Modal open={showEnrollStudent} onClose={() => { setShowEnrollStudent(false); enrollForm.reset(); }} title="Enroll Student" size="sm">
        <form onSubmit={enrollForm.handleSubmit(enrollStudent)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Student</label>
            <select {...enrollForm.register('studentId', { required: true })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">Choose a student...</option>
              {allStudents
                .filter((s: any) => !(course as any).enrolledStudents?.some((e: any) => e.id === s.id))
                .map((s: any) => (
                  <option key={s.id} value={s.id}>{s.first_name} {s.last_name} (@{s.username})</option>
                ))}
            </select>
            {allStudents.filter((s: any) => !(course as any).enrolledStudents?.some((e: any) => e.id === s.id)).length === 0 && (
              <p className="text-xs text-gray-400 mt-1">All students are already enrolled in this course.</p>
            )}
          </div>
          <div className="flex gap-3">
            <Button type="submit" loading={saving} className="flex-1">Enroll</Button>
            <Button type="button" variant="outline" onClick={() => setShowEnrollStudent(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>

      {/* Assign Teacher Modal */}
      <Modal open={showAssignTeacher} onClose={() => setShowAssignTeacher(false)} title="Assign Teacher" size="sm">
        <form onSubmit={teacherForm.handleSubmit(assignTeacher)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Teacher</label>
            <select {...teacherForm.register('teacherId', { required: true })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">Choose a teacher...</option>
              {teachers.map((t: any) => (
                <option key={t.id} value={t.id}>{t.first_name} {t.last_name} ({t.username})</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <Button type="submit" loading={saving} className="flex-1">Assign</Button>
            <Button type="button" variant="outline" onClick={() => setShowAssignTeacher(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
