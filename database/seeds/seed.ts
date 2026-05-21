/**
 * iMinds Tutorials — Database Seed Script
 * Run: npx ts-node database/seeds/seed.ts
 */

import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: '../../.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function generateUsername(firstName: string, lastName: string): string {
  const base = (firstName + lastName.charAt(0)).toLowerCase().replace(/[^a-z0-9]/g, '');
  return base;
}

async function getUniqueUsername(pool: Pool, base: string): Promise<string> {
  const { rows } = await pool.query('SELECT username FROM users WHERE username LIKE $1 ORDER BY username', [`${base}%`]);
  if (rows.length === 0) return base;
  const existing = rows.map((r: any) => r.username);
  if (!existing.includes(base)) return base;
  let i = 1;
  while (existing.includes(`${base}${i}`)) i++;
  return `${base}${i}`;
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('🌱 Seeding iMinds Tutorials database...');

    // ── Roles ──────────────────────────────────────────────
    await client.query(`
      INSERT INTO roles (name) VALUES ('admin'), ('teacher'), ('student')
      ON CONFLICT (name) DO NOTHING
    `);
    const { rows: roles } = await client.query('SELECT id, name FROM roles');
    const roleMap: Record<string, number> = {};
    roles.forEach((r: any) => (roleMap[r.name] = r.id));
    console.log('✅ Roles seeded');

    // ── Admin user ─────────────────────────────────────────
    const adminUsername = await getUniqueUsername(client as any, 'admin');
    const adminPassword = `${adminUsername}@123#`;
    const adminHash = await hashPassword(adminPassword);
    const adminId = uuidv4();

    await client.query(
      `INSERT INTO users (id, role_id, first_name, last_name, username, email, password_hash, must_change_password)
       VALUES ($1,$2,$3,$4,$5,$6,$7,false)
       ON CONFLICT (username) DO NOTHING`,
      [adminId, roleMap['admin'], 'Admin', 'User', adminUsername, 'admin@iminds.com', adminHash]
    );
    console.log(`✅ Admin seeded — username: ${adminUsername} | password: ${adminPassword}`);

    // ── Courses ────────────────────────────────────────────
    const scienceId = uuidv4();
    const mathsId = uuidv4();

    await client.query(
      `INSERT INTO courses (id, name, description, grade, price, currency, is_active, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT DO NOTHING`,
      [scienceId, 'Science', 'CBSE Grade 9 & 10 Science — Physics, Chemistry, Biology', 'both', 2500, 'AED', true, adminId]
    );
    await client.query(
      `INSERT INTO courses (id, name, description, grade, price, currency, is_active, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT DO NOTHING`,
      [mathsId, 'Maths', 'CBSE Grade 9 & 10 Mathematics — Algebra, Geometry, Calculus', 'both', 2500, 'AED', true, adminId]
    );
    console.log('✅ Courses seeded — Science & Maths');

    // ── Class Schedules ────────────────────────────────────
    const scienceSchedule = [
      { day: 'Monday',    start: '18:00', end: '19:00' },
      { day: 'Wednesday', start: '18:00', end: '19:00' },
      { day: 'Friday',    start: '18:00', end: '19:00' },
    ];
    const mathsSchedule = [
      { day: 'Tuesday',   start: '18:00', end: '19:00' },
      { day: 'Thursday',  start: '18:00', end: '19:00' },
      { day: 'Saturday',  start: '18:00', end: '19:00' },
    ];

    for (const s of scienceSchedule) {
      await client.query(
        `INSERT INTO class_schedules (id, course_id, day_of_week, start_time, end_time) VALUES ($1,$2,$3,$4,$5)`,
        [uuidv4(), scienceId, s.day, s.start, s.end]
      );
    }
    for (const s of mathsSchedule) {
      await client.query(
        `INSERT INTO class_schedules (id, course_id, day_of_week, start_time, end_time) VALUES ($1,$2,$3,$4,$5)`,
        [uuidv4(), mathsId, s.day, s.start, s.end]
      );
    }
    console.log('✅ Class schedules seeded');

    // ── Sample Teacher ─────────────────────────────────────
    const teacherUsername = await getUniqueUsername(client as any, generateUsername('Priya', 'Sharma'));
    const teacherPassword = `${teacherUsername}@123#`;
    const teacherHash = await hashPassword(teacherPassword);
    const teacherId = uuidv4();

    await client.query(
      `INSERT INTO users (id, role_id, first_name, last_name, username, email, password_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (username) DO NOTHING`,
      [teacherId, roleMap['teacher'], 'Priya', 'Sharma', teacherUsername, 'priya.sharma@iminds.com', teacherHash]
    );
    await client.query(
      `INSERT INTO teacher_profiles (id, user_id, qualification, bio, experience_years)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (user_id) DO NOTHING`,
      [uuidv4(), teacherId, 'M.Sc Physics', 'Experienced CBSE teacher with 8 years of teaching.', 8]
    );
    // Assign teacher to both courses
    await client.query(
      `INSERT INTO teacher_course_assignments (id, teacher_id, course_id, assigned_by)
       VALUES ($1,$2,$3,$4) ON CONFLICT (teacher_id, course_id) DO NOTHING`,
      [uuidv4(), teacherId, scienceId, adminId]
    );
    await client.query(
      `INSERT INTO teacher_course_assignments (id, teacher_id, course_id, assigned_by)
       VALUES ($1,$2,$3,$4) ON CONFLICT (teacher_id, course_id) DO NOTHING`,
      [uuidv4(), teacherId, mathsId, adminId]
    );
    console.log(`✅ Teacher seeded — username: ${teacherUsername} | password: ${teacherPassword}`);

    // ── Sample Student ─────────────────────────────────────
    const studentUsername = await getUniqueUsername(client as any, generateUsername('Aryan', 'Kumar'));
    const studentPassword = `${studentUsername}@123#`;
    const studentHash = await hashPassword(studentPassword);
    const studentId = uuidv4();

    await client.query(
      `INSERT INTO users (id, role_id, first_name, last_name, username, email, mobile, password_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (username) DO NOTHING`,
      [studentId, roleMap['student'], 'Aryan', 'Kumar', studentUsername, 'aryan.kumar@email.com', '+971501234567', studentHash]
    );
    await client.query(
      `INSERT INTO student_profiles (id, user_id, grade, parent_name, parent_email, parent_mobile)
       VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (user_id) DO NOTHING`,
      [uuidv4(), studentId, '10', 'Raj Kumar', 'raj.kumar@email.com', '+971501234560']
    );
    // Enroll student into both courses
    await client.query(
      `INSERT INTO course_enrollments (id, student_id, course_id, enrolled_by)
       VALUES ($1,$2,$3,$4) ON CONFLICT (student_id, course_id) DO NOTHING`,
      [uuidv4(), studentId, scienceId, adminId]
    );
    await client.query(
      `INSERT INTO course_enrollments (id, student_id, course_id, enrolled_by)
       VALUES ($1,$2,$3,$4) ON CONFLICT (student_id, course_id) DO NOTHING`,
      [uuidv4(), studentId, mathsId, adminId]
    );
    console.log(`✅ Student seeded — username: ${studentUsername} | password: ${studentPassword}`);

    // ── Science Modules ────────────────────────────────────
    const sciMod1Id = uuidv4();
    const sciMod2Id = uuidv4();
    const sciMod3Id = uuidv4();

    const scienceModules = [
      { id: sciMod1Id, title: 'Module 1: Matter in Our Surroundings', order: 0 },
      { id: sciMod2Id, title: 'Module 2: Is Matter Around Us Pure?', order: 1 },
      { id: sciMod3Id, title: 'Module 3: Atoms and Molecules', order: 2 },
    ];
    for (const m of scienceModules) {
      await client.query(
        `INSERT INTO modules (id, course_id, title, order_index, is_published, created_by)
         VALUES ($1,$2,$3,$4,true,$5) ON CONFLICT DO NOTHING`,
        [m.id, scienceId, m.title, m.order, adminId]
      );
    }

    // Module text content for Science Module 1
    await client.query(
      `INSERT INTO module_text_content (id, module_id, content, updated_by)
       VALUES ($1,$2,$3,$4) ON CONFLICT (module_id) DO NOTHING`,
      [uuidv4(), sciMod1Id, `# Matter in Our Surroundings

Matter is anything that has mass and occupies space. Everything around us — air, water, rocks, plants, and animals — is made of matter.

## States of Matter

Matter exists in three states:
1. **Solid** — definite shape and volume
2. **Liquid** — definite volume but no fixed shape
3. **Gas** — neither definite shape nor volume

## Characteristics of States of Matter

| Property     | Solid | Liquid | Gas |
|-------------|-------|--------|-----|
| Shape       | Fixed | Variable | Variable |
| Volume      | Fixed | Fixed  | Variable |
| Compressibility | Very low | Low | High |

## Key Concepts
- **Interconversion**: Matter can change from one state to another by changing temperature or pressure.
- **Evaporation**: Surface phenomenon — liquid changes to gas below boiling point.
- **Latent Heat**: Heat required to change state without change in temperature.
`, adminId]
    );

    // ── Maths Modules ──────────────────────────────────────
    const mathMod1Id = uuidv4();
    const mathMod2Id = uuidv4();
    const mathMod3Id = uuidv4();

    const mathsModules = [
      { id: mathMod1Id, title: 'Module 1: Number Systems', order: 0 },
      { id: mathMod2Id, title: 'Module 2: Polynomials', order: 1 },
      { id: mathMod3Id, title: 'Module 3: Coordinate Geometry', order: 2 },
    ];
    for (const m of mathsModules) {
      await client.query(
        `INSERT INTO modules (id, course_id, title, order_index, is_published, created_by)
         VALUES ($1,$2,$3,$4,true,$5) ON CONFLICT DO NOTHING`,
        [m.id, mathsId, m.title, m.order, adminId]
      );
    }

    await client.query(
      `INSERT INTO module_text_content (id, module_id, content, updated_by)
       VALUES ($1,$2,$3,$4) ON CONFLICT (module_id) DO NOTHING`,
      [uuidv4(), mathMod1Id, `# Number Systems

## Types of Numbers

- **Natural Numbers (N)**: 1, 2, 3, 4, ...
- **Whole Numbers (W)**: 0, 1, 2, 3, ...
- **Integers (Z)**: ..., -2, -1, 0, 1, 2, ...
- **Rational Numbers (Q)**: Numbers of the form p/q where q ≠ 0
- **Irrational Numbers**: Numbers that cannot be expressed as p/q (e.g., √2, π)
- **Real Numbers (R)**: All rational and irrational numbers

## Key Theorem
Every real number has a unique decimal expansion:
- Rational → terminating or recurring decimal
- Irrational → non-terminating, non-recurring decimal

## Operations on Real Numbers
- √a × √b = √(ab)
- √a / √b = √(a/b)
- (√a + √b)(√a - √b) = a - b
`, adminId]
    );

    // ── Sample Quiz (Science Module 1) ─────────────────────
    const quizId = uuidv4();
    await client.query(
      `INSERT INTO quizzes (id, module_id, title, description, time_limit_mins, pass_marks, max_attempts, is_published, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true,$8) ON CONFLICT (module_id) DO NOTHING`,
      [quizId, sciMod1Id, 'Quiz: Matter in Our Surroundings', 'Test your knowledge on states of matter.', 20, 60, 3, adminId]
    );

    const questions = [
      {
        text: 'Which state of matter has a definite shape and volume?',
        explanation: 'Solids have a fixed arrangement of particles, giving them definite shape and volume.',
        marks: 1,
        options: [
          { label: 'A', text: 'Solid', correct: true },
          { label: 'B', text: 'Liquid', correct: false },
          { label: 'C', text: 'Gas', correct: false },
          { label: 'D', text: 'Plasma', correct: false },
        ],
      },
      {
        text: 'What is the process of conversion of liquid to gas at any temperature called?',
        explanation: 'Evaporation is the conversion of liquid to vapor at any temperature, below the boiling point.',
        marks: 1,
        options: [
          { label: 'A', text: 'Condensation', correct: false },
          { label: 'B', text: 'Sublimation', correct: false },
          { label: 'C', text: 'Evaporation', correct: true },
          { label: 'D', text: 'Vaporization', correct: false },
        ],
      },
      {
        text: 'Which of the following is highly compressible?',
        explanation: 'Gases have large spaces between particles, making them highly compressible.',
        marks: 1,
        options: [
          { label: 'A', text: 'Iron', correct: false },
          { label: 'B', text: 'Water', correct: false },
          { label: 'C', text: 'Air', correct: true },
          { label: 'D', text: 'Wood', correct: false },
        ],
      },
      {
        text: 'What is latent heat?',
        explanation: 'Latent heat is the heat energy absorbed or released during a change of state at constant temperature.',
        marks: 2,
        options: [
          { label: 'A', text: 'Heat required to raise temperature by 1°C', correct: false },
          { label: 'B', text: 'Heat required to change state without temperature change', correct: true },
          { label: 'C', text: 'Heat lost during cooling', correct: false },
          { label: 'D', text: 'Heat stored in atoms', correct: false },
        ],
      },
      {
        text: 'At what temperature does water boil at standard pressure?',
        explanation: 'Water boils at 100°C (373 K) at 1 atmospheric pressure.',
        marks: 1,
        options: [
          { label: 'A', text: '0°C', correct: false },
          { label: 'B', text: '37°C', correct: false },
          { label: 'C', text: '100°C', correct: true },
          { label: 'D', text: '212°C', correct: false },
        ],
      },
    ];

    for (let qi = 0; qi < questions.length; qi++) {
      const q = questions[qi];
      const questionId = uuidv4();
      await client.query(
        `INSERT INTO quiz_questions (id, quiz_id, question_text, explanation, marks, order_index)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [questionId, quizId, q.text, q.explanation, q.marks, qi]
      );
      for (let oi = 0; oi < q.options.length; oi++) {
        const o = q.options[oi];
        await client.query(
          `INSERT INTO quiz_options (id, question_id, option_label, option_text, is_correct, order_index)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [uuidv4(), questionId, o.label, o.text, o.correct, oi]
        );
      }
    }
    console.log('✅ Sample quiz seeded (5 questions)');

    // ── Payment records ────────────────────────────────────
    await client.query(
      `INSERT INTO payments (id, student_id, course_id, amount, currency, status, payment_gateway)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
      [uuidv4(), studentId, scienceId, 2500, 'AED', 'paid', 'mock']
    );
    await client.query(
      `INSERT INTO payments (id, student_id, course_id, amount, currency, status, payment_gateway)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
      [uuidv4(), studentId, mathsId, 2500, 'AED', 'pending', 'mock']
    );
    console.log('✅ Sample payments seeded');

    await client.query('COMMIT');
    console.log('\n🎉 Database seeded successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Default credentials:');
    console.log(`  Admin   → username: ${adminUsername}   password: ${adminPassword}`);
    console.log(`  Teacher → username: ${teacherUsername} password: ${teacherPassword}`);
    console.log(`  Student → username: ${studentUsername} password: ${studentPassword}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
