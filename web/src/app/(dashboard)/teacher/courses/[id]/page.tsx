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
import { BookOpen, FileText, Video, Upload, ChevronDown, ChevronUp, Plus, Pencil, Trash2, Brain } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface ModuleForm { title: string; description: string; }
interface ModuleEditForm { title: string; description: string; isPublished: boolean; }

export default function TeacherCourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [showAddModule, setShowAddModule] = useState(false);
  const [showContentEditor, setShowContentEditor] = useState(false);
  const [showVideoForm, setShowVideoForm] = useState(false);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [contentText, setContentText] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [quizTitle, setQuizTitle] = useState('');
  const [quizPassMarks, setQuizPassMarks] = useState(60);
  const [quizTimeLimit, setQuizTimeLimit] = useState(20);
  const [quizQuestions, setQuizQuestions] = useState([
    { questionText: '', options: [{ label: 'A', text: '', isCorrect: true }, { label: 'B', text: '', isCorrect: false }, { label: 'C', text: '', isCorrect: false }, { label: 'D', text: '', isCorrect: false }] },
  ]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const addForm = useForm<ModuleForm>();
  const editForm = useForm<ModuleEditForm>();

  const fetchCourse = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/courses/${id}`);
      setCourse(data.data);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchCourse(); }, [fetchCourse]);

  async function addModule(data: ModuleForm) {
    setSaving(true);
    try {
      await api.post('/modules', { courseId: id, title: data.title, description: data.description });
      toast.success('Module added');
      setShowAddModule(false);
      addForm.reset();
      fetchCourse();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  }

  function openEditModule(m: Module) {
    editForm.reset({
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

  async function saveContent() {
    if (!selectedModule) return;
    setSaving(true);
    try {
      await api.put(`/modules/${selectedModule.id}`, { content: contentText, isPublished: true });
      toast.success('Content saved');
      setShowContentEditor(false);
      fetchCourse();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  }

  async function saveVideo() {
    if (!selectedModule) return;
    setSaving(true);
    try {
      await api.put(`/modules/${selectedModule.id}/video`, { videoUrl, videoType: 'url' });
      toast.success('Video URL saved');
      setShowVideoForm(false);
      fetchCourse();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  }

  function openQuizForm(m: Module) {
    setSelectedModule(m);
    setQuizTitle(`${m.title} — Quiz`);
    setQuizQuestions([
      { questionText: '', options: [{ label: 'A', text: '', isCorrect: true }, { label: 'B', text: '', isCorrect: false }, { label: 'C', text: '', isCorrect: false }, { label: 'D', text: '', isCorrect: false }] },
    ]);
    setShowQuizForm(true);
  }

  async function saveQuiz() {
    if (!selectedModule) return;
    if (!quizTitle.trim()) { toast.error('Quiz title is required'); return; }
    const validQs = quizQuestions.filter((q) => q.questionText.trim());
    if (!validQs.length) { toast.error('Add at least one question'); return; }

    setSaving(true);
    try {
      await api.post('/quizzes', {
        moduleId: selectedModule.id,
        title: quizTitle,
        passMarks: quizPassMarks,
        timeLimitMins: quizTimeLimit,
        maxAttempts: 3,
        isPublished: true,
        questions: validQs.map((q) => ({
          questionText: q.questionText,
          marks: 1,
          options: q.options.filter((o) => o.text.trim()),
        })),
      });
      toast.success('Quiz saved');
      setShowQuizForm(false);
      fetchCourse();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  }

  async function handleFileUpload(moduleId: string, file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name);
      await api.post(`/modules/${moduleId}/materials`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Material uploaded');
      fetchCourse();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setUploading(false); }
  }

  if (loading) return <><Header title="Course" /><LoadingSpinner /></>;
  if (!course) return <Header title="Course not found" />;

  return (
    <>
      <Header title={course.name} subtitle="Manage course content">
        <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowAddModule(true)}>
          Add Module
        </Button>
      </Header>
      <div className="p-8 space-y-4">
        {course.modules?.map((m: Module) => (
          <div key={m.id} className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div
              className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setExpandedModule(expandedModule === m.id ? null : m.id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary-50 text-primary-700 rounded-lg flex items-center justify-center text-sm font-bold">
                  {(m.order_index ?? 0) + 1}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{m.title}</p>
                  <p className="text-xs text-gray-400">{m.materials_count ?? 0} materials · {m.quiz_count ?? 0} quiz</p>
                </div>
              </div>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Badge color={m.is_published ? 'green' : 'yellow'}>{m.is_published ? 'Published' : 'Draft'}</Badge>
                <button
                  type="button"
                  onClick={() => openEditModule(m)}
                  title="Edit module"
                  className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-primary-600 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => deleteModule(m)}
                  title="Delete module"
                  className="p-1.5 rounded-md hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedModule(expandedModule === m.id ? null : m.id)}
                  className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 transition-colors"
                >
                  {expandedModule === m.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {expandedModule === m.id && (
              <div className="border-t border-gray-100 p-5 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" icon={<FileText className="w-3.5 h-3.5" />}
                    onClick={() => { setSelectedModule(m); setContentText(m.text_content || ''); setShowContentEditor(true); }}>
                    Edit Text Content
                  </Button>
                  <Button size="sm" variant="outline" icon={<Video className="w-3.5 h-3.5" />}
                    onClick={() => { setSelectedModule(m); setVideoUrl(''); setShowVideoForm(true); }}>
                    Add/Edit Video URL
                  </Button>
                  <label className="cursor-pointer">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      {uploading ? 'Uploading...' : 'Upload Material'}
                    </span>
                    <input type="file" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(m.id, file);
                    }} />
                  </label>
                  <Button size="sm" variant="outline" icon={<Brain className="w-3.5 h-3.5" />}
                    onClick={() => openQuizForm(m)}>
                    {(m.quiz_count ?? 0) > 0 ? 'Edit Quiz' : 'Add Quiz'}
                  </Button>
                </div>

                {m.text_content && (
                  <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 max-h-40 overflow-y-auto">
                    <pre className="whitespace-pre-wrap font-sans">{m.text_content.substring(0, 300)}{m.text_content.length > 300 ? '...' : ''}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {!course.modules?.length && (
          <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center text-gray-400">
            <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="mb-4">No modules in this course yet.</p>
            <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowAddModule(true)}>
              Add Your First Module
            </Button>
          </div>
        )}
      </div>

      {/* Add Module Modal */}
      <Modal open={showAddModule} onClose={() => { setShowAddModule(false); addForm.reset(); }} title="Add Module" size="sm">
        <form onSubmit={addForm.handleSubmit(addModule)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Module Title *</label>
            <input {...addForm.register('title', { required: true })} placeholder="e.g. Module 4: Light and Reflection"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea {...addForm.register('description')} rows={2}
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
        <form onSubmit={editForm.handleSubmit(saveModuleEdit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Module Title *</label>
            <input {...editForm.register('title', { required: true })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea {...editForm.register('description')} rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" {...editForm.register('isPublished')} className="w-4 h-4 rounded border-gray-300 text-primary-600" />
            Published
          </label>
          <div className="flex gap-3">
            <Button type="submit" loading={saving} className="flex-1">Save Changes</Button>
            <Button type="button" variant="outline" onClick={() => setEditingModule(null)}>Cancel</Button>
          </div>
        </form>
      </Modal>

      {/* Content Editor Modal */}
      <Modal open={showContentEditor} onClose={() => setShowContentEditor(false)} title={`Edit Content: ${selectedModule?.title}`} size="xl">
        <div className="space-y-4">
          <p className="text-xs text-gray-500">Supports Markdown formatting.</p>
          <textarea
            value={contentText}
            onChange={(e) => setContentText(e.target.value)}
            rows={20}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Write module content here... (Markdown supported)"
          />
          <div className="flex gap-3">
            <Button onClick={saveContent} loading={saving} className="flex-1">Save Content</Button>
            <Button variant="outline" onClick={() => setShowContentEditor(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Quiz Modal */}
      <Modal open={showQuizForm} onClose={() => setShowQuizForm(false)} title={`Quiz: ${selectedModule?.title}`} size="lg">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quiz title *</label>
            <input value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pass marks (%)</label>
              <input type="number" value={quizPassMarks} onChange={(e) => setQuizPassMarks(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time limit (mins)</label>
              <input type="number" value={quizTimeLimit} onChange={(e) => setQuizTimeLimit(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          </div>
          {quizQuestions.map((q, qi) => (
            <div key={qi} className="border border-gray-200 rounded-lg p-4 space-y-3">
              <label className="block text-sm font-medium text-gray-700">Question {qi + 1}</label>
              <input value={q.questionText} onChange={(e) => {
                const next = [...quizQuestions];
                next[qi] = { ...next[qi], questionText: e.target.value };
                setQuizQuestions(next);
              }} placeholder="Question text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              {q.options.map((o, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input type="radio" name={`correct-${qi}`} checked={o.isCorrect}
                    onChange={() => {
                      const next = [...quizQuestions];
                      next[qi].options = next[qi].options.map((opt, j) => ({ ...opt, isCorrect: j === oi }));
                      setQuizQuestions(next);
                    }} />
                  <span className="text-xs font-mono w-4">{o.label}</span>
                  <input value={o.text} onChange={(e) => {
                    const next = [...quizQuestions];
                    next[qi].options[oi] = { ...next[qi].options[oi], text: e.target.value };
                    setQuizQuestions(next);
                  }} placeholder={`Option ${o.label}`}
                    className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm" />
                </div>
              ))}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setQuizQuestions([
            ...quizQuestions,
            { questionText: '', options: [{ label: 'A', text: '', isCorrect: true }, { label: 'B', text: '', isCorrect: false }, { label: 'C', text: '', isCorrect: false }, { label: 'D', text: '', isCorrect: false }] },
          ])}>+ Add question</Button>
          <div className="flex gap-3 pt-2 sticky bottom-0 bg-white">
            <Button onClick={saveQuiz} loading={saving} className="flex-1">Save & publish quiz</Button>
            <Button variant="outline" onClick={() => setShowQuizForm(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Video URL Modal */}
      <Modal open={showVideoForm} onClose={() => setShowVideoForm(false)} title="Add Video URL" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">YouTube / Vimeo URL</label>
            <input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex gap-3">
            <Button onClick={saveVideo} loading={saving} className="flex-1">Save Video</Button>
            <Button variant="outline" onClick={() => setShowVideoForm(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
