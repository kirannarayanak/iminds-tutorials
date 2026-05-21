-- ============================================================
-- iMinds Tutorials — Database Schema
-- PostgreSQL 14+
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ROLES
-- ============================================================
CREATE TABLE roles (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(50) NOT NULL UNIQUE,  -- 'admin', 'teacher', 'student'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id               INTEGER NOT NULL REFERENCES roles(id),
  first_name            VARCHAR(100) NOT NULL,
  last_name             VARCHAR(100) NOT NULL,
  username              VARCHAR(100) NOT NULL UNIQUE,
  email                 VARCHAR(255) UNIQUE,
  mobile                VARCHAR(20),
  password_hash         TEXT NOT NULL,
  must_change_password  BOOLEAN NOT NULL DEFAULT TRUE,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  avatar_url            TEXT,
  created_by            UUID REFERENCES users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TEACHER PROFILES
-- ============================================================
CREATE TABLE teacher_profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  qualification   TEXT,
  bio             TEXT,
  experience_years INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STUDENT PROFILES
-- ============================================================
CREATE TABLE student_profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  grade           VARCHAR(10),           -- '9', '10'
  parent_name     VARCHAR(200),
  parent_email    VARCHAR(255),
  parent_mobile   VARCHAR(20),
  date_of_birth   DATE,
  address         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- COURSES
-- ============================================================
CREATE TABLE courses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(200) NOT NULL,
  description TEXT,
  grade       VARCHAR(10),              -- '9', '10', 'both'
  price       NUMERIC(10,2) DEFAULT 0,
  currency    VARCHAR(10) DEFAULT 'AED',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  thumbnail_url TEXT,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CLASS SCHEDULES
-- ============================================================
CREATE TABLE class_schedules (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  day_of_week VARCHAR(10) NOT NULL,     -- 'Monday', 'Tuesday', etc.
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TEACHER → COURSE ASSIGNMENTS
-- ============================================================
CREATE TABLE teacher_course_assignments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(teacher_id, course_id)
);

-- ============================================================
-- STUDENT → COURSE ENROLLMENTS
-- ============================================================
CREATE TABLE course_enrollments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_by UUID REFERENCES users(id),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(student_id, course_id)
);

-- ============================================================
-- MODULES
-- ============================================================
CREATE TABLE modules (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title       VARCHAR(300) NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MODULE TEXT CONTENT
-- ============================================================
CREATE TABLE module_text_content (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id   UUID NOT NULL UNIQUE REFERENCES modules(id) ON DELETE CASCADE,
  content     TEXT,                    -- Rich text / markdown
  updated_by  UUID REFERENCES users(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MODULE MATERIALS (PDF, images, docs)
-- ============================================================
CREATE TABLE module_materials (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id       UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title           VARCHAR(300) NOT NULL,
  file_name       VARCHAR(500) NOT NULL,
  file_type       VARCHAR(100),        -- 'pdf', 'image', 'doc'
  file_size       BIGINT,              -- bytes
  storage_path    TEXT NOT NULL,       -- path in storage bucket
  storage_provider VARCHAR(50) DEFAULT 'supabase', -- 'supabase', 'r2', etc.
  is_downloadable BOOLEAN NOT NULL DEFAULT TRUE,
  uploaded_by     UUID REFERENCES users(id),
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MODULE VIDEOS
-- ============================================================
CREATE TABLE module_videos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id       UUID NOT NULL UNIQUE REFERENCES modules(id) ON DELETE CASCADE,
  title           VARCHAR(300),
  video_type      VARCHAR(20) NOT NULL DEFAULT 'url', -- 'url', 'upload'
  video_url       TEXT,                -- YouTube/Vimeo/direct URL
  storage_path    TEXT,                -- if uploaded to storage
  storage_provider VARCHAR(50),
  duration_seconds INTEGER,
  thumbnail_url   TEXT,
  uploaded_by     UUID REFERENCES users(id),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- QUIZZES
-- ============================================================
CREATE TABLE quizzes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id       UUID NOT NULL UNIQUE REFERENCES modules(id) ON DELETE CASCADE,
  title           VARCHAR(300) NOT NULL,
  description     TEXT,
  time_limit_mins INTEGER,            -- NULL = no time limit
  pass_marks      NUMERIC(5,2),       -- minimum score to pass
  max_attempts    INTEGER DEFAULT 3,
  is_published    BOOLEAN NOT NULL DEFAULT FALSE,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- QUIZ QUESTIONS
-- ============================================================
CREATE TABLE quiz_questions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id         UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text   TEXT NOT NULL,
  explanation     TEXT,               -- shown after submission
  marks           NUMERIC(5,2) NOT NULL DEFAULT 1,
  order_index     INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- QUIZ OPTIONS (A/B/C/D per question)
-- ============================================================
CREATE TABLE quiz_options (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id     UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  option_label    CHAR(1) NOT NULL,   -- 'A', 'B', 'C', 'D'
  option_text     TEXT NOT NULL,
  is_correct      BOOLEAN NOT NULL DEFAULT FALSE,
  order_index     INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- QUIZ ATTEMPTS
-- ============================================================
CREATE TABLE quiz_attempts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id         UUID NOT NULL REFERENCES quizzes(id),
  student_id      UUID NOT NULL REFERENCES users(id),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at    TIMESTAMPTZ,
  duration_secs   INTEGER,
  score           NUMERIC(8,2),
  max_score       NUMERIC(8,2),
  is_passed       BOOLEAN,
  status          VARCHAR(20) NOT NULL DEFAULT 'in_progress' -- 'in_progress', 'submitted', 'expired'
);

-- ============================================================
-- QUIZ ANSWERS (per attempt)
-- ============================================================
CREATE TABLE quiz_answers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id      UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  question_id     UUID NOT NULL REFERENCES quiz_questions(id),
  selected_option_id UUID REFERENCES quiz_options(id),
  is_correct      BOOLEAN,
  marks_awarded   NUMERIC(5,2) DEFAULT 0
);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE payments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id          UUID NOT NULL REFERENCES users(id),
  course_id           UUID NOT NULL REFERENCES courses(id),
  amount              NUMERIC(10,2) NOT NULL,
  currency            VARCHAR(10) NOT NULL DEFAULT 'AED',
  status              VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending', 'paid', 'failed', 'refunded'
  payment_gateway     VARCHAR(50),     -- 'stripe', 'telr', 'mock'
  gateway_transaction_id TEXT,
  gateway_reference   TEXT,
  gateway_response    JSONB,
  paid_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id    UUID REFERENCES users(id),
  action      VARCHAR(100) NOT NULL,   -- 'create_user', 'update_module', etc.
  entity_type VARCHAR(100),            -- 'user', 'course', 'module', etc.
  entity_id   TEXT,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(50) NOT NULL,
  title       VARCHAR(255) NOT NULL,
  message     TEXT,
  entity_type VARCHAR(50),
  entity_id   TEXT,
  metadata    JSONB DEFAULT '{}'::jsonb,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CLASS ATTENDANCE (daily roll call)
-- ============================================================
CREATE TABLE class_attendance (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'present',
  notes           TEXT,
  marked_by       UUID REFERENCES users(id),
  marked_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, course_id, attendance_date)
);

-- ============================================================
-- REFRESH TOKENS
-- ============================================================
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at  TIMESTAMPTZ
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_course_enrollments_student ON course_enrollments(student_id);
CREATE INDEX idx_course_enrollments_course ON course_enrollments(course_id);
CREATE INDEX idx_teacher_assignments_teacher ON teacher_course_assignments(teacher_id);
CREATE INDEX idx_teacher_assignments_course ON teacher_course_assignments(course_id);
CREATE INDEX idx_modules_course ON modules(course_id);
CREATE INDEX idx_quiz_questions_quiz ON quiz_questions(quiz_id);
CREATE INDEX idx_quiz_attempts_student ON quiz_attempts(student_id);
CREATE INDEX idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);
CREATE INDEX idx_payments_student ON payments(student_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_attendance_date ON class_attendance(attendance_date);
CREATE INDEX idx_attendance_course_date ON class_attendance(course_id, attendance_date);
CREATE INDEX idx_attendance_student ON class_attendance(student_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at         BEFORE UPDATE ON users          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_courses_updated_at       BEFORE UPDATE ON courses        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_modules_updated_at       BEFORE UPDATE ON modules        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_quizzes_updated_at       BEFORE UPDATE ON quizzes        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_payments_updated_at      BEFORE UPDATE ON payments       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_teacher_updated_at       BEFORE UPDATE ON teacher_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_student_updated_at       BEFORE UPDATE ON student_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
