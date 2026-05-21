'use client';

import { Badge } from '@/components/ui/Badge';
import { GraduationCap, User, BookOpen, Layers } from 'lucide-react';

interface Person {
  id?: string;
  first_name: string;
  last_name: string;
  role?: string;
  qualification?: string;
}

interface ModuleOutline {
  id: string;
  title: string;
  description?: string | null;
  order_index?: number;
  is_published?: boolean;
  materials_count?: number;
  quiz_count?: number;
}

interface CourseCatalogInfoProps {
  creator?: Person | null;
  teachers?: Person[];
  modules?: ModuleOutline[];
  compact?: boolean;
}

function roleLabel(role?: string) {
  if (role === 'admin') return 'Admin';
  if (role === 'teacher') return 'Teacher';
  return role || 'Staff';
}

export function CourseCatalogInfo({ creator, teachers = [], modules = [], compact = false }: CourseCatalogInfoProps) {
  const teacherList = Array.isArray(teachers) ? teachers : [];
  const moduleList = Array.isArray(modules) ? modules : [];

  return (
    <div className={`space-y-3 ${compact ? 'text-xs' : 'text-sm'}`}>
      {creator && (
        <div className="flex items-start gap-2 text-gray-600">
          <User className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} mt-0.5 shrink-0 text-gray-400`} />
          <div>
            <span className="text-gray-400">Created by </span>
            <span className="font-medium text-gray-800">
              {creator.first_name} {creator.last_name}
            </span>
            <span className="text-gray-400"> ({roleLabel(creator.role)})</span>
          </div>
        </div>
      )}

      <div className="flex items-start gap-2">
        <GraduationCap className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} mt-0.5 shrink-0 text-gray-400`} />
        <div className="min-w-0 flex-1">
          <span className="text-gray-400">Instructor{teacherList.length !== 1 ? 's' : ''}: </span>
          {teacherList.length ? (
            <span className="font-medium text-gray-800">
              {teacherList.map((t) => `${t.first_name} ${t.last_name}`).join(', ')}
            </span>
          ) : (
            <span className="text-gray-500 italic">To be announced</span>
          )}
        </div>
      </div>

      <div className="flex items-start gap-2">
        <Layers className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} mt-0.5 shrink-0 text-gray-400`} />
        <div className="min-w-0 flex-1">
          <p className="text-gray-400 mb-1.5">
            {moduleList.length} module{moduleList.length !== 1 ? 's' : ''} in this course
          </p>
          {moduleList.length ? (
            <ul className={`space-y-1 ${compact ? '' : 'bg-gray-50 rounded-lg p-3 border border-gray-100'}`}>
              {moduleList.map((m, i) => (
                <li key={m.id} className="flex items-start gap-2 text-gray-700">
                  <BookOpen className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary-500" />
                  <span className="flex-1 min-w-0">
                    <span className="font-medium">{m.title}</span>
                    {!m.is_published && (
                      <Badge color="yellow" className="ml-1.5 text-[10px] py-0">Draft</Badge>
                    )}
                    {!compact && m.description && (
                      <span className="block text-xs text-gray-400 line-clamp-1 mt-0.5">{m.description}</span>
                    )}
                    {(m.materials_count ?? 0) > 0 || (m.quiz_count ?? 0) > 0 ? (
                      <span className="block text-[10px] text-gray-400 mt-0.5">
                        {(m.materials_count ?? 0) > 0 && `${m.materials_count} materials`}
                        {(m.materials_count ?? 0) > 0 && (m.quiz_count ?? 0) > 0 && ' · '}
                        {(m.quiz_count ?? 0) > 0 && 'quiz'}
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 italic">No modules added yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
