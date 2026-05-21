-- Class attendance records (daily roll call)
CREATE TABLE IF NOT EXISTS class_attendance (
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

CREATE INDEX IF NOT EXISTS idx_attendance_date ON class_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_course_date ON class_attendance(course_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON class_attendance(student_id);
