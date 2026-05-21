export type Role = 'admin' | 'teacher' | 'student';

export interface User {
  id: string;
  role_id: number;
  role_name: Role;
  first_name: string;
  last_name: string;
  username: string;
  email: string | null;
  mobile: string | null;
  must_change_password: boolean;
  is_active: boolean;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface JwtPayload {
  userId: string;
  username: string;
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
  thumbnail_url: string | null;
  created_at: string;
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  order_index: number;
  is_published: boolean;
  created_at: string;
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
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  explanation: string | null;
  marks: number;
  order_index: number;
  options: QuizOption[];
}

export interface QuizOption {
  id: string;
  question_id: string;
  option_label: string;
  option_text: string;
  is_correct: boolean;
  order_index: number;
}

export interface Payment {
  id: string;
  student_id: string;
  course_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_gateway: string | null;
  gateway_transaction_id: string | null;
  paid_at: string | null;
  created_at: string;
}

// Augment Express Request with user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
