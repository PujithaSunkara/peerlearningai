# PeerConnect AI — AI-Powered Peer-to-Peer Learning Platform

PeerConnect AI connects university students who need help with specific technical doubts to peer mentors who have verified or relevant competency evidence. It combines **Google Gemini AI** topic/competency extraction with a **5-factor deterministic backend peer-matching engine**, **real-time Socket.IO chat**, **Agora WebRTC video sessions**, and an **isolated Mini Skill Assessment & Progress Tracking module**.

---

## 1. Architecture Overview

- **Frontend (`src/`)**: React 19 + Vite SPA using React Router v7, Axios with automatic JWT Bearer injection, Socket.IO Client for real-time messaging/collaborative notes, Agora Web SDK (`agora-rtc-sdk-ng`) for live peer video sessions, and Recharts for visualizing score progression across retries.
- **Backend (`backend/` & `server.ts`)**: Node.js + Express REST API server integrated with Socket.IO on port `3000`.
- **Database (`backend/models/`)**: MongoDB with Mongoose schemas (`User`, `Competency`, `DoubtRequest`, `LearningRequest`, `LearningSession`, `ChatMessage`, `SessionSummary`, `AssessmentTask`, `AssessmentAttempt`, `AssessmentReview`). Automatically connects to `MONGODB_URI` or launches an embedded `MongoMemoryServer` pre-populated with realistic seed data (`backend/seed/seedData.ts`).
- **AI & Matching Engine (`backend/services/`)**:
  - `geminiService.ts`: Server-side `@google/genai` (`gemini-3.8-flash`) integration for doubt topic extraction, post-session note summarization, and personalized assessment coaching, with deterministic fallbacks if the API key is absent.
  - `matchingService.ts`: Deterministic 5-factor ranking engine scoring candidates across Skill Relevance (35 pts), Topic Similarity (25 pts), Competency & Verification Level (20 pts), Availability (10 pts), and Mentoring Experience & Rating (10 pts).
  - `codeSandboxService.ts`: Isolated code evaluation using Node `vm.createContext` (800ms timeout) and isolated Python `python3 -I` subprocesses (1500ms timeout) with a 3-part rubric (Correctness 60%, Logic & Approach 20%, Code Quality 20%).

---

## 2. Folder Structure

```text
/
├── .env.example
├── server.ts                         # Express + Socket.IO + Vite full-stack server entry
├── backend/
│   ├── config/
│   │   └── db.ts                     # MongoDB & MongoMemoryServer connection manager
│   ├── middleware/
│   │   ├── auth.ts                   # JWT authentication & reviewer RBAC middleware
│   │   ├── errorHandler.ts           # Centralized error handling
│   │   └── rateLimit.ts              # Express rate limiters for auth & AI endpoints
│   ├── models/                       # 10 Mongoose schemas with indexes & references
│   │   ├── User.ts
│   │   ├── Competency.ts
│   │   ├── DoubtRequest.ts
│   │   ├── LearningRequest.ts
│   │   ├── LearningSession.ts
│   │   ├── ChatMessage.ts
│   │   ├── SessionSummary.ts
│   │   ├── AssessmentTask.ts
│   │   ├── AssessmentAttempt.ts
│   │   └── AssessmentReview.ts
│   ├── routes/
│   │   ├── authRoutes.ts
│   │   ├── userRoutes.ts
│   │   ├── doubtRoutes.ts
│   │   ├── learningRoutes.ts
│   │   └── assessmentRoutes.ts
│   ├── seed/
│   │   └── seedData.ts               # Sample users, competencies, doubts, and assessments
│   ├── services/
│   │   ├── geminiService.ts          # Server-side @google/genai calls + fallbacks
│   │   ├── matchingService.ts        # Deterministic 5-factor peer matching algorithm
│   │   └── codeSandboxService.ts     # Isolated code execution & rubric evaluator
│   └── socket/
│       └── socketHandler.ts          # Socket.IO real-time chat & shared notes sync
└── src/
    ├── components/
    │   ├── AppShell.tsx              # Navigation layout for all authenticated views
    │   └── UserAvatar.tsx            # Resilient avatar with gradient fallback
    ├── context/
    │   └── AuthContext.tsx           # JWT authentication context
    ├── pages/                        # All 17 application pages
    │   ├── LandingPage.tsx
    │   ├── LoginPage.tsx
    │   ├── RegisterPage.tsx
    │   ├── DashboardPage.tsx
    │   ├── ProfilePage.tsx
    │   ├── CompetencyPage.tsx
    │   ├── SubmitDoubtPage.tsx
    │   ├── PeerMatchingPage.tsx
    │   ├── LearningRequestsPage.tsx
    │   ├── ChatPage.tsx
    │   ├── VideoSessionPage.tsx
    │   ├── SessionSummariesPage.tsx
    │   ├── AssessmentCatalogPage.tsx
    │   ├── AssessmentTakingPage.tsx
    │   ├── AssessmentResultsPage.tsx
    │   ├── AssessmentReviewsPage.tsx
    │   └── AssessmentProgressPage.tsx
    ├── services/
    │   └── api.ts                    # Axios instance with Bearer token interceptor
    └── types/
        └── index.ts
```

---

## 3. REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a student or authorized reviewer account |
| `POST` | `/api/auth/login` | Authenticate with email/password and receive JWT |
| `GET` | `/api/auth/me` | Fetch current authenticated user profile |
| `GET` | `/api/users/dashboard-stats` | Aggregate KPI counts, active sessions, and recent attempts |
| `PUT` | `/api/users/profile` | Update academic details, bio, and mentoring availability |
| `GET` | `/api/users/competency-catalog` | List standard competency categories and skills |
| `POST` | `/api/users/competencies` | Add or update a self-reported competency tag |
| `DELETE` | `/api/users/competencies/:skillName` | Remove a competency tag from user profile |
| `POST` | `/api/doubts` | Analyze doubt with Gemini AI and rank candidate peers |
| `GET` | `/api/doubts` | List student's submitted doubts and ranked peer matches |
| `POST` | `/api/learning/requests` | Send a learning request to a matched peer mentor |
| `GET` | `/api/learning/requests` | List incoming (mentor) and outgoing (learner) requests |
| `PATCH` | `/api/learning/requests/:id/respond` | Accept or reject a request (creates `LearningSession`) |
| `GET` | `/api/learning/sessions` | List active and completed peer learning sessions |
| `GET` | `/api/learning/sessions/:id` | Fetch session details, chat history, and summaries |
| `GET` | `/api/learning/sessions/:id/video-credentials` | Retrieve Agora WebRTC status and channel credentials |
| `POST` | `/api/learning/sessions/:id/summarize` | Generate structured AI session summary from notes & chat |
| `GET` | `/api/assessments/tasks` | List assessment catalog with user attempt statistics |
| `GET` | `/api/assessments/tasks/:id` | Fetch assessment questions and test cases |
| `POST` | `/api/assessments/tasks/:id/submit` | Grade MCQ, short-answer, and isolated coding tasks |
| `GET` | `/api/assessments/attempts/:id` | View attempt score, rubric breakdown, and test results |
| `GET` | `/api/assessments/progress` | Retrieve first/latest/best scores and retry improvement |
| `POST` | `/api/assessments/reviews` | Submit a formal review request for a disputed attempt |
| `GET` | `/api/assessments/reviews` | List review requests (students see own; reviewers see all) |
| `PATCH` | `/api/assessments/reviews/:id/decide` | Authorized reviewer updates score and resolves dispute |

---

## 4. Running Locally on Windows with VS Code

1. **Open the Project in VS Code**:
   ```powershell
   git clone <your-repo-url>
   cd peerconnect-ai
   code .
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env` in the project root:
   ```powershell
   copy .env.example .env
   ```
   Fill in your keys in `.env`:
   - `GEMINI_API_KEY`: Obtain from Google AI Studio.
   - `MONGODB_URI`: Local MongoDB (`mongodb://127.0.0.1:27017/peerconnect_ai`) or MongoDB Atlas URI. (If omitted, the app automatically runs an embedded MongoDB instance with seed data).
   - `JWT_SECRET`: Any strong random string.
   - `AGORA_APP_ID`: Obtain from the [Agora Console](https://console.agora.io/) (Project Management → Create Project → App ID).

3. **Install Dependencies & Start the Server**:
   ```powershell
   npm install
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## 5. Pre-Seeded Demo Credentials

- **Student / Learner & Peer Mentor**: `alex@peerconnect.edu` / `password123`
- **Peer Mentor (Django & Python Verified)**: `elena@peerconnect.edu` / `password123`
- **Authorized Assessment Reviewer**: `priya@peerconnect.edu` / `password123`
