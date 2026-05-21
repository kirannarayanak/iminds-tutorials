# iMinds Tutorials — MVP

Online tuition platform for **CBSE Grade 9 & 10** students with a web app, mobile app, and REST API.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Web App | Next.js 14 + TypeScript + Tailwind CSS |
| Mobile App | Expo (React Native) + TypeScript |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL 14+ |
| Auth | JWT (access token 15m + refresh token 7d) |
| Storage | Supabase Storage (abstracted — swap to Cloudflare R2) |
| Payments | Mock (pluggable for Stripe UAE / Telr) |

---

## Project Structure

```
iminds-tutorials/
├── backend/           # Node.js REST API
├── web/               # Next.js web app
├── mobile/            # Expo React Native app
├── database/
│   ├── schema.sql     # Full PostgreSQL schema
│   └── seeds/seed.ts  # Seed script
├── docker-compose.yml # PostgreSQL + backend
├── .env.example       # Environment variable template
└── README.md
```

---

## Deploy online (Vercel + Google)

**Step-by-step guide (free URL, custom domain, from zero):**  
→ **[docs/DEPLOY.md](docs/DEPLOY.md)**

**Google Search after deploy:**  
→ **[docs/GOOGLE_SEARCH.md](docs/GOOGLE_SEARCH.md)**

---

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 14+ (or Docker)
- npm or yarn

### 1 · Environment Setup

```bash
cp .env.example .env
# Edit .env with your actual values
```

### 2 · Database Setup

**Option A — Docker (recommended for dev):**
```bash
docker-compose up postgres -d
```

**Option B — Local PostgreSQL:**
```bash
createdb iminds_tutorials
psql iminds_tutorials < database/schema.sql
```

### 3 · Seed the Database

```bash
cd backend
npm install
cd ../database
# Set DATABASE_URL in .env first, then:
npx ts-node -e "require('dotenv').config({path:'../.env'})" seeds/seed.ts
```

Or from the backend directory:
```bash
cd backend
npx ts-node ../database/seeds/seed.ts
```

After seeding, you'll see:
```
✅ Admin   → username: admin    password: admin@123#
✅ Teacher → username: priyas   password: priyas@123#
✅ Student → username: aryank   password: aryank@123#
```

### 4 · Start the Backend

```bash
cd backend
npm install
npm run dev
# → Listening on http://localhost:4000
```

### 5 · Start the Web App

```bash
cd web
npm install
npm run dev
# → http://localhost:3000
```

### 6 · Start the Mobile App

```bash
cd mobile
npm install
npx expo start
# Scan QR code with Expo Go app
# Or press 'a' for Android emulator / 'i' for iOS simulator
```

---

## Default Credentials

| Role | Username | Password | Notes |
|------|----------|----------|-------|
| Admin | `admin` | `admin@123#` | Full access |
| Teacher | `priyas` | `priyas@123#` | Assigned to Science & Maths |
| Student | `aryank` | `aryank@123#` | Enrolled in Science & Maths |

> **Username formula:** `firstName + firstLetterOfLastName` (lowercase).  
> **Default password:** `username@123#`.  
> Users are prompted to change password on first login.

---

## Role Access

| Feature | Admin | Teacher | Student |
|---------|-------|---------|---------|
| Full CRUD on everything | ✅ | ❌ | ❌ |
| Manage own courses | — | ✅ (assigned only) | ❌ |
| Upload materials/videos | ✅ | ✅ (assigned) | ❌ |
| Create/edit quizzes | ✅ | ✅ (assigned) | ❌ |
| View student results | ✅ | ✅ (assigned) | ❌ |
| View/download materials | ✅ | ✅ | ✅ (enrolled) |
| Attempt quizzes | — | — | ✅ |
| View own quiz results | — | — | ✅ |

---

## API Reference

Base URL: `http://localhost:4000/api/v1`

All protected routes require: `Authorization: Bearer <access_token>`

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login, returns tokens |
| GET | `/auth/me` | Get current user |
| POST | `/auth/change-password` | Change password |

### Users (Admin only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | List users (with role/search filter) |
| POST | `/users` | Create user (auto-generates username + password) |
| PUT | `/users/:id` | Update user |
| POST | `/users/:id/reset-password` | Reset to default password |
| PATCH | `/users/:id/toggle-status` | Activate/deactivate |

### Courses
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/courses` | List courses (role-filtered) |
| GET | `/courses/:id` | Course detail + modules + schedule |
| POST | `/courses` | Create course (admin) |
| PUT | `/courses/:id` | Update course (admin) |
| POST | `/courses/:id/assign-teacher` | Assign teacher (admin) |
| POST | `/courses/:id/enroll` | Enroll student (admin) |
| PUT | `/courses/:id/schedules` | Update schedule (admin) |

### Modules
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/modules/:id` | Module detail + materials + quiz |
| POST | `/modules` | Create module (admin/teacher) |
| PUT | `/modules/:id` | Update content (admin/teacher) |
| POST | `/modules/:id/materials` | Upload material (multipart) |
| PUT | `/modules/:id/video` | Add/update video URL |

### Quizzes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/quizzes/:id` | Quiz with questions (correct answers hidden from students) |
| POST | `/quizzes` | Create/update quiz |
| POST | `/quizzes/:id/submit` | Submit quiz (student) |
| GET | `/quizzes/:id/attempts` | List attempts |
| GET | `/quizzes/attempts/:attemptId` | Attempt detail |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/payments` | List payments (role-filtered) |
| GET | `/payments/summary` | Payment summary (admin) |
| POST | `/payments/initiate` | Initiate payment |
| POST | `/payments/confirm` | Confirm payment |
| PATCH | `/payments/:id/status` | Update status (admin) |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard/admin` | Admin dashboard stats |
| GET | `/dashboard/teacher` | Teacher dashboard |
| GET | `/dashboard/student` | Student dashboard |

---

## Username Generation Rules

```
username = firstName + firstLetterOfLastName (lowercase, alphanumeric only)

Examples:
  Kiran Narayana  → kirann
  Priya Sharma    → priyas
  Aryan Kumar     → aryank

If duplicate:
  kirann → kirann1 → kirann2 → ...

Default password:
  username + "@123#"  →  kirann@123#
```

---

## Storage Architecture

Currently backed by **Supabase Storage**. Fully abstracted in `backend/src/services/storage.service.ts`.

**To migrate to Cloudflare R2:**
1. Set `STORAGE_PROVIDER=r2` in `.env`
2. Add R2 credentials to `.env`
3. Install `@aws-sdk/client-s3`
4. Implement the R2 branch in `storage.service.ts`
5. No other code changes required — all upload/signed-URL calls go through the service

**Supabase Storage setup:**
1. Create a Supabase project at https://supabase.com
2. Create buckets: `materials`, `videos`, `avatars`
3. Set bucket policies (private, signed URL access)
4. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to `.env`

---

## Payment Gateway Integration

Currently using **mock payment** (always succeeds). The mock flow:
1. Student clicks "Pay Now"
2. API creates a pending payment record
3. `POST /payments/confirm` auto-confirms it (mock gateway)
4. Status updates to "paid"

**To switch to Stripe UAE:**
1. Create Stripe account → Dashboard → API Keys
2. Set `PAYMENT_GATEWAY=stripe` in `.env`
3. Set `STRIPE_SECRET_KEY=sk_live_...`
4. Implement the Stripe branch in `payment.service.ts` (placeholders are there)
5. Add Stripe.js to the web app for card element
6. Set up webhook for `payment_intent.succeeded`

**To switch to Telr:**
1. Create Telr merchant account at https://telr.com
2. Set `PAYMENT_GATEWAY=telr` in `.env`
3. Set `TELR_STORE_ID` and `TELR_AUTH_KEY`
4. Implement Telr hosted payment page redirect in `payment.service.ts`
5. Handle Telr return URL and webhook

---

## Database Schema Overview

```
roles                       → admin, teacher, student
users                       → all user accounts (unified)
teacher_profiles            → extended teacher info
student_profiles            → extended student info + parent details
courses                     → Science, Maths, ...
class_schedules             → day-wise schedule per course
teacher_course_assignments  → teacher ↔ course (many-to-many)
course_enrollments          → student ↔ course (auto-enrolled in Science + Maths)
modules                     → chapters within a course
module_text_content         → rich text/markdown per module
module_materials            → PDF/docs/images with cloud storage refs
module_videos               → video URL or uploaded video
quizzes                     → one per module
quiz_questions              → MCQ questions per quiz
quiz_options                → A/B/C/D options per question
quiz_attempts               → student attempt records
quiz_answers                → per-question answers in an attempt
payments                    → payment records per student+course
audit_logs                  → all admin/teacher write actions
refresh_tokens              → secure token storage
```

---

## Initial Data (after seed)

- **2 courses**: Science (Mon/Wed/Fri 6–7 PM), Maths (Tue/Thu/Sat 6–7 PM)
- **3 modules each**: Module 1, 2, 3 with text content for Module 1
- **1 sample quiz**: Science Module 1 — 5 MCQ questions, 6 marks total
- **1 teacher**: Priya Sharma (assigned to both courses)
- **1 student**: Aryan Kumar (enrolled in both, 1 paid payment, 1 pending)

---

## Security Notes

- Passwords hashed with **bcrypt** (cost factor 12) — never stored in plain text
- JWT access tokens expire in **15 minutes**
- Refresh tokens expire in **7 days**
- File URLs are **signed** (time-limited), not publicly accessible
- Role-based access enforced at **API middleware level**
- Students cannot access non-enrolled courses — enforced in every controller
- Teachers cannot access non-assigned courses — enforced in every controller
- Input validation on all API endpoints
- Rate limiting: 300 req/15min per IP
- CORS restricted to configured origins
- Audit log for all admin/teacher write operations

---

## Environment Variables Reference

See `.env.example` for the full list with descriptions.

---

## Deployment Checklist

- [ ] Set strong `JWT_SECRET` (≥32 random chars)
- [ ] Set `NODE_ENV=production`
- [ ] Configure `CORS_ORIGIN` to your actual domains
- [ ] Set up Supabase project and storage buckets
- [ ] Run `npm run build` in backend and web
- [ ] Apply migrations to production DB
- [ ] Run seed script (or create admin manually)
- [ ] Configure real payment gateway (Stripe/Telr)
- [ ] Set up HTTPS / reverse proxy (nginx/Caddy)
- [ ] Enable PostgreSQL SSL (`ssl: true` in db config)
