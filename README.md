# ReflectAI — Private AI Journal & Reflection Assistant

A secure, production-grade AI-powered journaling and reflection SaaS application built on **Google Gemini**, **Firebase (Authentication & Cloud Firestore)**, **Express (Node.js)**, and **React (Vite, TypeScript, Tailwind CSS)**.

ReflectAI provides a mindful, private digital space for personal growth, multi-turn AI reflection, structured session summaries, automatic habit and goal extraction, observational emotional landscape analysis, and full data export capabilities with client-to-server zero-trust security.

---

## Table of Contents

1. [Architecture & Flow Diagrams](#architecture--flow-diagrams)
   - [System Architecture & Security Perimeter](#1-system-architecture--security-perimeter)
   - [Multi-Turn Reflection & SSE Streaming Flow](#2-multi-turn-reflection--sse-streaming-flow)
   - [Gemini Resilient Fallback Ladder Flow](#3-gemini-resilient-fallback-ladder-flow)
   - [Authentication & Data Isolation Lifecycle](#4-authentication--data-isolation-lifecycle)
2. [Complete Project & Repository Structure](#complete-project--repository-structure)
3. [Step-by-Step Local Setup & Testing Guide](#step-by-step-local-setup--testing-guide)
   - [Prerequisites](#prerequisites)
   - [Installation](#installation)
   - [Environment Configuration](#environment-configuration)
   - [Running the Local Server](#running-the-local-server)
   - [End-to-End Functional Test Suite (Walkthrough)](#end-to-end-functional-test-suite-walkthrough)
   - [API Endpoint Testing via cURL](#api-endpoint-testing-via-curl)
4. [Production Deployment to Google Cloud Run](#production-deployment-to-google-cloud-run)
   - [1. Enable Google Cloud APIs](#1-enable-google-cloud-apis)
   - [2. Secret Management Setup (Secret Manager)](#2-secret-management-setup-secret-manager)
   - [3. Firestore Database Security Rules](#3-firestore-database-security-rules)
   - [4. Deploy to Cloud Run](#4-deploy-to-cloud-run)
   - [5. Campaign Challenge Verification Label](#5-campaign-challenge-verification-label)
5. [Security & Architectural Directives](#security--architectural-directives)

---

## Architecture & Flow Diagrams

### 1. System Architecture & Security Perimeter

```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                CLIENT-SIDE LAYER (Browser)                              │
│                                                                                         │
│  ┌─────────────────────────┐   ┌──────────────────────────┐   ┌──────────────────────┐  │
│  │   React + Vite SPA      │   │  Firebase Client SDK     │   │   App State & UI     │  │
│  │  • Modular Components   │   │  • Google Federated Auth │   │  • Undefined-Strip   │  │
│  │  • Tailwind CSS         │   │  • Client-side Firestore │   │  • Optimistic State  │  │
│  │  • Motion Animations    │   │  • Local Persistence     │   │  • Markdown Renderer │  │
│  └───────────┬─────────────┘   └─────────────┬────────────┘   └──────────────────────┘  │
└──────────────┼───────────────────────────────┼──────────────────────────────────────────┘
               │                               │ Direct Firestore Operations
               │ Authenticated HTTP Requests   │ (Subject to Owner-Bound Rules)
               │ Header: Bearer <ID_TOKEN>     ▼
               │                ┌─────────────────────────────────────────────────────────┐
               │                │                 CLOUD FIRESTORE                         │
               │                │  • Owner-bound security rules: request.auth.uid == uid │
               │                │  • Subcollections: sessions, messages, goals, insights  │
               │                └─────────────────────────────────────────────────────────┘
               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND GATEWAY LAYER (Express on Node.js)                    │
│                                                                                         │
│  ┌───────────────────────────────┐      ┌────────────────────────────────────────────┐  │
│  │     Security & Parsers        │      │          Authentication Barrier            │  │
│  │  • Helmet Security Headers    │ ───► │  • requireAuth middleware                  │  │
│  │  • Express JSON & URL-Encoded │      │  • Cryptographic JWT validation            │  │
│  │  • Zod Schema Input Guard     │      │  • Request context binding (req.user)      │  │
│  └───────────────────────────────┘      └─────────────────────┬──────────────────────┘  │
│                                                               │                         │
│                                                               ▼                         │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐  │
│  │                              AI & BUSINESS LOGIC                                  │  │
│  │  • SSE Streaming Response Generator (/api/ai/chat)                                │  │
│  │  • Reflection Modes: Reflect, Brainstorm, Solve Problem, Plan, Summarize          │  │
│  │  • Zero-Quota Sentiment & Heuristic Intent Extractors (Mood, Goals, Titles)       │  │
│  │  • Data Export Service (/api/export: JSON & Markdown)                             │  │
│  └───────────────────────────────────────────┬───────────────────────────────────────┘  │
└──────────────────────────────────────────────┼──────────────────────────────────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                         GOOGLE GEMINI AI INTEGRATION LAYER                              │
│                                                                                         │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐  │
│  │                        Quad-Tier Fallback Ladder Engine                           │  │
│  │   [Tier 1] gemini-3.6-flash (Primary, low-latency, balanced)                      │  │
│  │     ▼ (on 429/503/404 + 800ms backoff)                                            │  │
│  │   [Tier 2] gemini-3.1-flash-lite (High-availability, ultra-fast)                  │  │
│  │     ▼ (on transient error)                                                        │  │
│  │   [Tier 3] gemini-flash-latest (Dynamic alias)                                    │  │
│  │     ▼ (on failure)                                                                │  │
│  │   [Tier 4] gemini-3.7-flash (Deep reasoning & cognitive depth)                   │  │
│  └───────────────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 2. Multi-Turn Reflection & SSE Streaming Flow

```text
User                  React Frontend             Express Server (/api/ai/chat)         Gemini API Ladder
 │                          │                                 │                                │
 ├─ Types reflection ──────►│                                 │                                │
 │  and clicks "Reflect"    ├─ Optimistically renders msg     │                                │
 │                          ├─ Strips undefined & saves to DB │                                │
 │                          │  (users/{uid}/sessions/...)     │                                │
 │                          │                                 │                                │
 │                          ├─ POST /api/ai/chat ────────────►│                                │
 │                          │  Headers: Bearer <ID_TOKEN>     ├─ Verifies JWT via Firebase     │
 │                          │  Body: { message, mode, ... }   ├─ Validates Zod schema          │
 │                          │                                 ├─ Injects mode system prompt    │
 │                          │                                 │                                │
 │                          │                                 ├─ Calls model with fallback ───►│
 │                          │◄── SSE: EventStream connected ──┤                                │
 │                          │                                 │◄── Yields streaming chunks ────┤
 │◄─ Displays live stream ──┼◄── SSE: data: {"chunk": "..."} ─┤                                │
 │   typing animation       │                                 │                                │
 │                          │                                 ├─ Detects mood & goals (local)  │
 │                          │                                 ├─ Generates session title       │
 │                          │◄── SSE: data: {"type": "done"} ─┤                                │
 │                          │                                 │                                │
 │                          ├─ Strips undefined & writes AI   │                                │
 │                          │  response to Firestore DB       │                                │
 │◄─ Shows mood & goal tag ─┤                                 │                                │
```

---

### 3. Gemini Resilient Fallback Ladder Flow

```text
Request Received
       │
       ▼
[Attempt Tier 1: gemini-3.6-flash] ────► Success? ────► Stream Chunks to Client
       │ (Failed: 429 Quota / 503 Overload / 404)
       ▼
Log Warning & Apply 800ms Backoff
       │
       ▼
[Attempt Tier 2: gemini-3.1-flash-lite] ─► Success? ────► Stream Chunks to Client
       │ (Failed)
       ▼
[Attempt Tier 3: gemini-flash-latest] ───► Success? ────► Stream Chunks to Client
       │ (Failed)
       ▼
[Attempt Tier 4: gemini-3.7-flash] ──────► Success? ────► Stream Chunks to Client
       │ (Failed)
       ▼
Surface Friendly Error & Graceful Heuristic Summary (Zero App Crash)
```

---

### 4. Authentication & Data Isolation Lifecycle

```text
  Browser / User                   Firebase Auth                    Cloud Firestore
        │                                │                                 │
        ├─ "Sign in with Google" ───────►│                                 │
        │                                ├─ Authenticates user identity    │
        │◄─ Returns ID Token & User UID ─┤                                 │
        │                                                                  │
        ├─ Read/Write Request: /users/{userId}/sessions ──────────────────►│
        │  with request.auth.uid                                           ├─ Check firestore.rules
        │                                                                  ├─ request.auth.uid == userId?
        │                                                                  │    YES: Allow Read/Write
        │                                                                  │    NO:  Deny (403)
        │◄─ Returns user-isolated documents ───────────────────────────────┤
```

---

## Complete Project & Repository Structure

```text
.
├── .env.example                  # Template of required client & server environment variables
├── .gitignore                    # Git ignore specifications (node_modules, dist, .env)
├── README.md                     # Comprehensive architecture, deployment, and testing documentation
├── firebase-applet-config.json   # Auto-generated Firebase client credentials for the applet
├── firebase-blueprint.json       # Database schema blueprint & collection structure
├── firestore.indexes.json        # Composite indexes configuration for Cloud Firestore
├── firestore.rules               # Production owner-bound Firestore security rules
├── index.html                    # Single Page Application HTML entry point
├── metadata.json                 # AI Studio applet permissions and major capabilities configuration
├── package.json                  # Application dependencies, scripts, and build definitions
├── tsconfig.json                 # TypeScript strict compilation configuration
├── vite.config.ts                # Vite bundler configuration with Tailwind integration
│
├── server                        # Express Backend Service Layer
│   ├── auth.ts                   # Cryptographic Firebase ID Token verification middleware
│   ├── gemini.ts                 # Gemini SDK initialization, fallback ladder, and prompt engineering
│   └── routes                    # Modular Express API Routes
│       ├── ai.ts                 # /api/ai/chat (SSE streaming, multi-turn, mode switching)
│       └── export.ts             # /api/export (JSON and Markdown reflection data export)
├── server.ts                     # Main Express server entry point, mounts API routes & Vite middleware
│
└── src                           # React Frontend Application
    ├── main.tsx                  # React DOM rendering entry point
    ├── App.tsx                   # Top-level view routing & navigation controller
    ├── index.css                 # Global styling directives with Tailwind CSS
    ├── vite-env.d.ts             # Vite environment type declarations
    │
    ├── context                   # React Context Providers
    │   ├── AuthContext.tsx       # Firebase Auth state observer, sign-in, and sign-out provider
    │   └── ToastContext.tsx      # System toast notifications (success, warnings, error banners)
    │
    ├── lib                       # Shared Utility & Service Libraries
    │   ├── firebase              # Firebase SDK initialization
    │   │   └── config.ts         # Initializes Firebase App, Auth, and Firestore instances
    │   └── firestore             # Database Access Layer
    │       └── service.ts        # Type-safe CRUD operations with strict undefined-stripping
    │
    ├── types                     # Global TypeScript Definitions
    │   └── index.ts              # Data contracts: User, Session, Message, Goal, Insight, Mood
    │
    └── components                # User Interface Components
        ├── layout                # Shell Layout Components
        │   ├── Header.tsx        # Top app bar (user profile, mode toggle, data export trigger)
        │   └── Sidebar.tsx       # Collapsible navigation drawer, session list, new session button
        │
        ├── journal               # Journaling Core
        │   └── JournalView.tsx   # Interactive chat thread, prompt chips, mode selector, SSE streaming
        │
        ├── dashboard             # Overview & Progress
        │   └── DashboardView.tsx # Quick statistics, recent reflections, streak cards, active goals
        │
        ├── goals                 # Goal Setting & Tracking
        │   └── GoalsView.tsx     # Milestone sliders (0-100%), status toggles, goal creation modal
        │
        ├── history               # Reflection Archive
        │   └── HistoryView.tsx   # Full session directory, keyword search, mood filter chips
        │
        ├── insights              # Emotional & Growth Analytics
        │   └── InsightsView.tsx  # Mood distribution charts, cognitive themes, reflective takeaways
        │
        ├── settings              # User Settings
        │   └── SettingsView.tsx  # Privacy audit, security indicators, account data purge & export
        │
        └── landing               # Public Unauthenticated Experience
            └── LandingView.tsx   # Product features, privacy guarantee, Google Sign-In action
```

---

## Step-by-Step Local Setup & Testing Guide

### Prerequisites

Ensure your development machine has the following tools installed:
- **Node.js**: v18.0.0 or later (`node -v`)
- **npm**: v9.0.0 or later (`npm -v`)
- **Google Cloud SDK** (`gcloud` CLI) installed and logged in (`gcloud auth login`)
- **Firebase CLI** (`npm install -g firebase-tools`)

---

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd reflect-ai
   ```

2. **Install project dependencies**:
   ```bash
   npm install
   ```

---

### Running the Local Server

Start the unified development server:
```bash
npm run dev
```

The application runs at **`http://localhost:3000`**. The unified server starts an Express instance on port 3000 with Vite middleware mounted, handling both frontend HMR and server-side `/api/*` routes concurrently.

To verify code quality and build compilation:
```bash
# Type check and lint
npm run lint

# Production bundle compilation
npm run build
```

---

### End-to-End Functional Test Suite (Walkthrough)

Walk through each of the following test scenarios to verify full application stability:

#### Test Case 1: Google Authentication
- **Step 1**: Open `http://localhost:3000` in your browser.
- **Step 2**: The unauthenticated Landing page should display. Click **"Sign in with Google"**.
- **Step 3**: Authorize your Google account via the popup.
- **Validation**:
  - The view automatically transitions to the **Journal Dashboard**.
  - Your Google avatar, display name, and email render in the top navigation header.
  - A user record is initialized under `/users/{your_uid}` in Firestore.

#### Test Case 2: Creating a New Journal Reflection Session
- **Step 1**: Click the **"+ New Reflection"** button in the left sidebar.
- **Validation**:
  - A new session is created with the temporary title "Personal Reflection".
  - The conversation viewport loads with empty prompt chips (e.g., *"What is on your mind right now?"*).
  - The new session appears at the top of the sidebar list.

#### Test Case 3: Submitting a Journal Entry with Real-Time SSE Streaming
- **Step 1**: In the text area, type:
  > *"I have been feeling stressed about my upcoming project deadline and need clarity on how to prioritize."*
- **Step 2**: Click **"Reflect"** (or press Enter).
- **Validation**:
  - Your message appears immediately in the conversation thread.
  - The ReflectAI assistant initiates a streaming response with dynamic typing chunks.
  - The active model badge in the message footer confirms `gemini-3.6-flash`.
  - The session title in the sidebar automatically updates to an evocative summary (e.g., *"Prioritizing Under Project Deadlines"*).
  - The detected mood badge (**Stressed**) is displayed in the session header.

#### Test Case 4: Reflection Framework Mode Switching
- **Step 1**: In the mode selector above the input box, select **"Brainstorm"**.
- **Step 2**: Type: *"I need creative ideas for naming our open-source privacy tool."* and click send.
- **Validation**:
  - ReflectAI adopts the Brainstorm framework, providing lateral ideation, varied angles, and creative angles.
  - Test other modes: **Solve a Problem** (root cause decomposition), **Plan** (actionable timeline), and **Summarize**.

#### Test Case 5: Automatic Goal Detection & Habit Tracking
- **Step 1**: In your reflection, type:
  > *"I want to run 5 kilometers every morning before starting work."*
- **Step 2**: Send the message.
- **Validation**:
  - ReflectAI identifies the ambition and surfaces an interactive **"Goal Detected"** banner.
  - Click **"Add to Goals"**.
  - Navigate to the **Goals** tab in the sidebar.
  - Verify the goal appears with a progress bar (0%), status dropdown, and target notes.
  - Drag the slider to 50% and click save; reload the page to verify persistence.

#### Test Case 6: Session Summary Generation
- **Step 1**: In a reflection session with 2 or more messages, click **"Summarize Session"** in the top header.
- **Validation**:
  - A modal opens displaying structured AI insights: **Main Topic**, **Key Points**, **Potential Challenges**, and **Possible Next Steps**.
  - Click **"Save Summary"**. The summary is stored in the Firestore document under `/users/{uid}/sessions/{sessionId}`.

#### Test Case 7: Search and Filter Historical Reflections
- **Step 1**: Navigate to the **History** tab in the sidebar.
- **Step 2**: Type a keyword from a past entry into the search bar.
- **Step 3**: Click a mood filter tag (e.g., "Stressed" or "Calm").
- **Validation**:
  - The session list instantly filters in real time.
  - Clicking any session card opens the complete transcript modal.

#### Test Case 8: Data Export (JSON & Markdown)
- **Step 1**: Click the **"Export"** icon in the header or in Settings.
- **Step 2**: Click **"Download Markdown (.md)"**.
- **Step 3**: Click **"Download JSON (.json)"**.
- **Validation**:
  - Markdown file downloads containing formatted headers, goal checklists, and full conversation transcripts.
  - JSON file downloads containing complete structured data for portability.

---

### API Endpoint Testing via cURL

To test server-side endpoints directly, retrieve an ID token from your browser session (via DevTools console: `await firebase.auth().currentUser.getIdToken()`) and run:

```bash
# 1. Health check endpoint (Public)
curl -X GET http://localhost:3000/api/health

# Expected response:
# {"status":"ok","timestamp":"2026-08-28T..."}

# 2. Authenticated Chat Endpoint
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN" \
  -d '{
    "message": "Hello ReflectAI, testing local API.",
    "mode": "reflect",
    "history": [],
    "stream": false
  }'

# 3. Unauthorized Rejection Check (Zero-Trust)
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Unauthorized attempt"}'

# Expected response:
# HTTP 401 Unauthorized: {"error":"Missing or malformed Authorization header"}
```

---

## Production Deployment to Google Cloud Run

Deploy ReflectAI to Google Cloud Run with Secret Manager and Cloud Firestore using standard `gcloud` commands.

### 1. Enable Google Cloud APIs

```bash
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  cloudbuild.googleapis.com
```

---

### 2. Secret Management Setup (Secret Manager)

Securely inject your `GEMINI_API_KEY` into Cloud Run via Google Cloud Secret Manager:

```bash
# 1. Create the secret in Secret Manager
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"

# 2. Add your secret value
echo -n "YOUR_ACTUAL_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 3. Retrieve your Project Number
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")

# 4. Grant Cloud Run default compute service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

### 3. Firestore Database Security Rules

ReflectAI enforces strict owner-bound isolation in `firestore.rules`. Deploy this configuration to protect all user data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // User document and isolated subcollections
    match /users/{userId} {
      allow read, write: if isOwner(userId);

      match /sessions/{sessionId} {
        allow read, write: if isOwner(userId);

        match /messages/{messageId} {
          allow read, write: if isOwner(userId);
        }
      }

      match /goals/{goalId} {
        allow read, write: if isOwner(userId);
      }

      match /savedInsights/{insightId} {
        allow read, write: if isOwner(userId);
      }

      match /streaks/{streakId} {
        allow read, write: if isOwner(userId);
      }
    }

    // Explicit fallback denial
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Deploy the rules using the Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

### 4. Deploy to Cloud Run

Build and launch the container on Cloud Run:

```bash
gcloud run deploy reflect-ai \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 3000 \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --set-env-vars VITE_FIREBASE_PROJECT_ID="$(gcloud config get-value project)"
```

---

### 5. Campaign Challenge Verification Label

Apply the mandatory verification label to register your Cloud Run deployment:

```bash
gcloud run services update reflect-ai \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## Security & Architectural Directives

- **Zero Hardcoded Credentials**: No private keys or API tokens exist in client bundles or git repositories. All server-side secrets are resolved via Secret Manager or environment variables.
- **Cryptographic Token Verification**: All backend routes decode and cryptographically verify the Firebase ID Token using standard JSON Web Token verification with Google's public x509 certs.
- **Strict Undefined-Stripping**: The Firestore service layer (`src/lib/firestore/service.ts`) runs all outgoing payloads through `sanitizeForFirestore()`, removing any `undefined` properties that would cause database write rejections.
- **Client-Side OAuth**: All Google Workspace / Google Sign-In flows are initiated client-side through the Firebase SDK (`signInWithPopup`), avoiding server-side redirect risks.
- **Non-Clinical Disclaimers**: All emotional landscape analyses and AI reflection prompts state clearly that ReflectAI is an introspective tool, not a substitute for clinical psychological advice.
