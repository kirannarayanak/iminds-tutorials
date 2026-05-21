export type Role = 'admin' | 'teacher' | 'student';

export interface AuthUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string | null;
  role: Role;
  mustChangePassword: boolean;
}

export interface Course {
  id: string;
  name: string;
  description: string | null;
  grade: string | null;
  price: number;
  currency: string;
  is_active: boolean;
  enrolled_count?: number;
  schedule_days?: string[];
  schedules?: ClassSchedule[];
  modules?: Module[];
  teachers?: Pick<User, 'id' | 'first_name' | 'last_name' | 'email'>[];
  creator?: { id: string; first_name: string; last_name: string; role?: string } | null;
  is_enrolled?: boolean;
  has_pending_payment?: boolean;
  preview?: boolean;
}

export interface ClassSchedule {
  id: string;
  course_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  notes?: string;
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  order_index: number;
  is_published: boolean;
  text_content?: string;
  materials_count?: number;
  quiz_count?: number;
  materials?: Material[];
  video?: Video | null;
  quiz?: Quiz | null;
}

export interface Material {
  id: string;
  module_id: string;
  title: string;
  file_name: string;
  file_type: string;
  file_size: number;
  signedUrl?: string;
  uploaded_at: string;
}

export interface Video {
  id: string;
  module_id: string;
  title: string;
  video_type: 'url' | 'upload';
  video_url: string | null;
}

export interface Quiz {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  time_limit_mins: number | null;
  pass_marks: number | null;
  max_attempts: number;
  is_published: boolean;
  questions?: QuizQuestion[];
  attemptInfo?: {
    attemptsUsed: number;
    maxAttempts: number;
    canAttempt: boolean;
  };
}

export interface QuizQuestion {
  id: string;
  question_text: string;
  explanation: string | null;
  marks: number;
  order_index: number;
  options: QuizOption[];
}

export interface QuizOption {
  id: string;
  label: string;
  text: string;
  isCorrect?: boolean | null;
  orderIndex: number;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  student_id: string;
  score: number;
  max_score: number;
  is_passed: boolean;
  submitted_at: string;
  duration_secs: number | null;
  first_name?: string;
  last_name?: string;
  quiz_title?: string;
}

export interface Payment {
  id: string;
  student_id: string;
  course_id: string;
  course_name: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_gateway: string | null;
  paid_at: string | null;
  created_at: string;
  first_name?: string;
  last_name?: string;
}

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  email: string | null;
  mobile: string | null;
  role: Role;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
  profile?: any;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}
