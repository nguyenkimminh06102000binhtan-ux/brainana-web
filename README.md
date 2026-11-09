# brainana-web

Marketing site and full-stack web app for **brainana.app** — an AI-powered flashcard and spaced-repetition learning platform supporting 80+ languages, course creation, and subscription billing.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Prerequisites](#prerequisites)
3. [Local Setup](#local-setup)
4. [Environment Variables](#environment-variables)
5. [Project Structure](#project-structure)
6. [Architecture Overview](#architecture-overview)
7. [Database (Supabase)](#database-supabase)
8. [Authentication](#authentication)
9. [Routing & Pages](#routing--pages)
10. [API Routes](#api-routes)
11. [Server Actions](#server-actions)
12. [Middleware](#middleware)
13. [AI Integration](#ai-integration)
14. [Spaced Repetition (SM-2)](#spaced-repetition-sm-2)
15. [Billing & Payments (Polar)](#billing--payments-polar)
16. [Quota System](#quota-system)
17. [Text-to-Speech & Storage](#text-to-speech--storage)
18. [Internationalization](#internationalization)
19. [Rate Limiting](#rate-limiting)
20. [Key Utilities](#key-utilities)
21. [Design System](#design-system)
22. [Deployment](#deployment)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.6 (App Router) |
| Language | TypeScript 5 |
| UI | React 19, Tailwind CSS 4 |
| Database | Supabase (PostgreSQL + Storage + Auth) |
| Cache / Rate Limiting | Upstash Redis |
| AI | Anthropic Claude (primary) / Mistral (switchable) |
| Text-to-Speech | Google Cloud TTS |
| Payments | Polar (subscriptions + one-time top-ups) |
| Hosting | Vercel |

---

## Prerequisites

- **Node.js >= 20** (enforced in `package.json`)
- **pnpm** (recommended; `npm install -g pnpm`)
- **Supabase CLI** (`npm install -g supabase`) for local database work
- Accounts / API keys: Supabase project, Anthropic or Mistral, Google Cloud TTS, Upstash Redis, Polar

---

## Local Setup

```bash
# 1. Clone the repo
git clone <repo-url>
cd brainana-web

# 2. Install dependencies
pnpm install

# 3. Copy and fill in environment variables
cp .env.example .env.local
# Edit .env.local with your keys (see Environment Variables section)

# 4. Run the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

**Important — Node.js via nvm:** If you use nvm and get `node: No such file or directory`, run:
```bash
nvm install 20
nvm alias default 20
```
Then open a new terminal. Alternatively, symlink node into a PATH-stable location:
```bash
ln -sf ~/.nvm/versions/node/v20.x.x/bin/node /usr/local/bin/node
```

### Database (Supabase)

The project uses a hosted Supabase project. For local development with the real DB, set `NEXT_PUBLIC_SUPABASE_URL` and keys to point at the hosted project (see [Environment Variables](#environment-variables)).

To run Supabase locally (optional):
```bash
supabase start          # starts a local Postgres + Auth instance
supabase db push        # applies migrations in supabase/migrations/
```

Schema is in [`supabase/schema.sql`](supabase/schema.sql). Migrations live in [`supabase/migrations/`](supabase/migrations/) (49 files, prefix-numbered).

---

## Environment Variables

Create `.env.local` at the project root. All variables below are required unless marked optional.

### Supabase

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>     # server-only, never expose to client
NEXT_PUBLIC_SITE_URL=http://localhost:3000        # your public URL (ngrok URL in dev)
```

### Upstash Redis (rate limiting)

```env
KV_REST_API_URL=https://<project>.upstash.io
KV_REST_API_TOKEN=<token>
KV_URL=rediss://<connection-string>
REDIS_URL=rediss://<connection-string>
```

### AI Providers

Only one AI provider is active at runtime (configured in [`utils/ai-client.ts`](utils/ai-client.ts)). Provide keys for whichever you use.

```env
ANTHROPIC_API_KEY=sk-ant-api03-...       # Claude (Anthropic)
MISTRAL_API_KEY=...                       # Mistral (via OpenAI-compatible API)
```

### Google Cloud TTS

```env
GOOGLE_TTS_API_KEY=AIza...
```

### Billing — Polar (current provider)

```env
BILLING_PROVIDER=polar
POLAR_SERVER=sandbox                     # or "production"
POLAR_ACCESS_TOKEN=polar_oat_...
POLAR_WEBHOOK_SECRET=polar_whs_...

# Product IDs (from your Polar dashboard)
POLAR_PLUS_PRODUCT_ID=<uuid>              # Plus monthly ($5)
POLAR_PLUS_YEARLY_PRODUCT_ID=<uuid>       # Plus yearly ($48)
POLAR_PRO_PRODUCT_ID=<uuid>               # Pro monthly ($10)
POLAR_PRO_YEARLY_PRODUCT_ID=<uuid>        # Pro yearly ($96)
POLAR_TOPUP_CHARS_100K_PRODUCT_ID=<uuid>
POLAR_TOPUP_CHARS_300K_PRODUCT_ID=<uuid>
POLAR_TOPUP_CHARS_1M_PRODUCT_ID=<uuid>
```

### Legacy (Lemon Squeezy — deprecated, keep for reference)

```env
# These are no longer used at runtime but still present in .env.local
LEMONSQUEEZY_API_KEY=...
LEMONSQUEEZY_STORE_ID=...
# (various variant IDs)
```

---

## Project Structure

```
brainana-web/
├── app/                          # Next.js App Router
│   ├── (admin)/                  # Admin dashboard (/admin/*) — requires is_admin flag
│   ├── (app)/                    # Authenticated user routes (/home, /browse, etc.)
│   │   ├── _components/          # Shared components used only within (app)
│   │   ├── actions.ts            # Shared server actions (enroll, rate, profile update)
│   │   ├── billing/              # Subscription management pages
│   │   ├── browse/               # Course discovery
│   │   ├── c/[slug]/             # Course detail + edit
│   │   ├── create/               # Course builder
│   │   ├── courses/              # User's created courses list
│   │   ├── home/                 # Dashboard
│   │   ├── leaderboard/          # Global XP leaderboard
│   │   ├── library/              # User's enrolled courses
│   │   ├── settings/             # User preferences
│   │   ├── speed-review/[slug]/  # Speed drilling mode
│   │   ├── start/                # Onboarding flow
│   │   ├── study/[slug]/         # Study session (flashcard modes)
│   │   └── u/[username]/         # Public user profile
│   ├── (marketing)/              # Public pages (/, /login, /pricing, /legal/*)
│   ├── actions/                  # Global server actions (AI, TTS, drafts, billing)
│   ├── api/                      # API route handlers
│   │   ├── analyze-file/         # File → text extraction
│   │   └── polar/webhook/        # Billing webhook receiver
│   ├── auth/callback/            # OAuth code exchange
│   ├── constants/                # Shared constants (languages, categories)
│   └── layout.tsx                # Root layout (font loading, theme)
├── components/                   # Global reusable UI components
├── hooks/                        # Custom React hooks
├── proxy.ts                      # Next.js middleware (rate limiting + session refresh)
├── public/
│   └── locales/                  # 82 JSON locale files (one per UI language)
├── scripts/                      # Data migration & locale generation scripts
├── supabase/
│   ├── migrations/               # 49 numbered migration files
│   └── schema.sql                # Full schema snapshot
├── types/
│   ├── supabase.ts               # Auto-generated Supabase TypeScript types
│   └── course-draft.ts           # Draft autosave types
├── utils/
│   ├── supabase/
│   │   ├── server.ts             # SSR Supabase client (uses cookies)
│   │   ├── admin.ts              # Service-role client (bypasses RLS)
│   │   └── middleware.ts         # Session refresh helper
│   ├── ai-client.ts              # AI provider abstraction (Anthropic / Mistral)
│   ├── quota.ts                  # Quota balance check + deduction
│   ├── polar.ts                  # Polar billing helpers
│   ├── sm2.ts                    # SM-2 spaced repetition algorithm
│   ├── tts.ts                    # Google TTS voice mapping
│   ├── rate-limit.ts             # Upstash Redis rate limiting
│   ├── i18n.ts                   # i18n helper
│   ├── storage.ts                # Supabase Storage helpers
│   ├── resolve-media-url.ts      # Media URL construction
│   └── compress-image.ts         # Client-side image compression
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## Architecture Overview

```
Browser
  │
  ├─ Static/RSC pages ──► Next.js App Router (server components by default)
  │                           │
  │                           ├─ Server Actions  ─► Supabase DB (via service role or user session)
  │                           ├─ API Routes      ─► Supabase, Polar webhooks, AI APIs
  │                           └─ Streaming RSC   ─► Suspense boundaries for slow data
  │
  ├─ Auth ──► Supabase Auth (email + Google OAuth)
  │               └─ Session cookies refreshed by middleware on every request
  │
  ├─ File upload ──► Supabase Storage (temp-uploads bucket) ──► /api/analyze-file
  │
  └─ Payments ──► Polar checkout redirect ──► Polar webhooks ──► /api/polar/webhook
                                                                       └─► Supabase DB
                                                                            (user_subscriptions,
                                                                             quota_transactions)
```

**Request lifecycle:**
1. Request hits `proxy.ts` (middleware) — blocked user agents get 403, rate-limited IPs get 429
2. Session cookie is refreshed (via Supabase SSR helpers)
3. Unauthenticated users on protected routes are redirected to `/login`
4. Page/server component runs, fetches data from Supabase using the user's session
5. Server actions and API routes use the service-role client for privileged operations (quota deduction, billing state changes)

---

## Database (Supabase)

### Core Tables

| Table | Purpose |
|---|---|
| `profiles` | User profile (username, display name, avatar, plan, XP, streak, languages) |
| `courses` | Learning courses (title, slug, category, languages, visibility, stats) |
| `levels` | Sections/chapters within a course (ordered by `position`) |
| `items` | Individual flashcards (front/back text, audio URLs, image URL, JSONB rich content) |
| `user_courses` | Course enrollments + preferred question types |
| `item_progress` | Per-user, per-card spaced repetition state (ease factor, interval, next review date) |
| `study_sessions` | Completed study session records (XP earned, accuracy) |
| `xp_logs` | Append-only XP audit log (powers the leaderboard) |
| `mems` | Community memory hints on flashcards (max 200 chars each) |
| `mem_votes` | Upvotes on mems |
| `follows` | Social graph (follower → following) |
| `badges` / `user_badges` | Achievement system |
| `feature_flags` | Per-plan feature toggles |
| `course_drafts` | Auto-saved JSON blobs for in-progress course creation |
| `user_subscriptions` | Billing state: current plan, quota balances, Polar subscription ID |
| `quota_transactions` | Append-only ledger of every quota credit/debit |
| `processed_billing_events` | Webhook deduplication (idempotency) |

### Key Enums

```sql
plan:                'free' | 'plus' | 'pro'
visibility:          'public' | 'unlisted' | 'private'
level:               'beginner' | 'intermediate' | 'advanced'
subscription_status: 'active' | 'trialing' | 'past_due' | 'unpaid' | 'cancelled' | 'expired'
```

### Row-Level Security (RLS)

All tables have RLS enabled. The key rules:

- **Public content** (`courses`, `profiles`, `mems`): readable by anyone; writable only by the owner
- **Private user data** (`item_progress`, `user_courses`, `study_sessions`): readable/writable only by the owning user
- **Billing data** (`user_subscriptions`, `quota_transactions`): readable by the owning user; writable only by the service role (server-side)
- **XP logs**: publicly readable for leaderboard; writable only by the service role

Always use `utils/supabase/server.ts` for user-scoped queries and `utils/supabase/admin.ts` only for privileged operations (billing, quota deduction, admin actions).

### Migrations

Migrations are in [`supabase/migrations/`](supabase/migrations/) numbered `001_` to `051_`. Run them in order via the Supabase CLI:

```bash
supabase db push
```

Notable migration groups:
- `001–010`: Initial schema, question types, item progress
- `011–030`: Quota system, billing provider introduction
- `031–046`: Billing provider migrations (Paddle → Lemon Squeezy → Polar)
- `047–051`: Webhook idempotency, course drafts, learner count sync, storage hardening

### Database Triggers

- `handle_new_user()` — auto-creates a `profiles` row on every `auth.users` INSERT
- Mem vote counter — increments/decrements `mems.helpful_count` on `mem_votes` INSERT/DELETE
- Learner count sync — keeps `courses.learner_count` in sync on `user_courses` changes

---

## Authentication

**Provider:** Supabase Auth (email/password + Google OAuth)

### Flow

```
/signup or /login
    │
    ▼
Supabase Auth (handles tokens, session cookies)
    │
    ▼ (OAuth redirect)
/auth/callback  ─► checks onboarding_completed on profile
    │                   ├─ incomplete → /start (onboarding wizard)
    │                   └─ complete  → /home (or ?next= param)
    │
    ▼
middleware (proxy.ts) refreshes session on every request
```

### Onboarding Steps (`/start`)

New users must complete before accessing the app:
1. Display name
2. Learning purpose
3. Category interests
4. Native language

On completion, `profiles.onboarding_completed` is set to `true` and a `user_subscriptions` row with the free plan is created.

### Supabase Client Patterns

```typescript
// In server components / server actions (uses session cookies)
import { createClient } from "@/utils/supabase/server";
const supabase = await createClient();

// In API routes / billing / quota operations (bypasses RLS)
import { createAdminClient } from "@/utils/supabase/admin";
const supabase = createAdminClient();
```

Never use the admin client in code paths that could be triggered by arbitrary users without explicit server-side authorization checks.

---

## Routing & Pages

The app uses Next.js route groups to separate layouts:

### `(marketing)` — Public

| Route | Description |
|---|---|
| `/` | Landing page (redirects to `/home` if logged in) |
| `/login` | Email + Google login |
| `/signup` | Registration |
| `/verify-email` | Email verification gate |
| `/pricing` | Plan comparison and checkout links |
| `/legal/privacy` | Privacy policy |
| `/legal/terms` | Terms of service |
| `/legal/cookies` | Cookie policy |

### `(app)` — Authenticated

| Route | Description |
|---|---|
| `/start` | Onboarding wizard |
| `/home` | Dashboard: enrolled courses, daily goal, streaks, hard cards due |
| `/browse` | Course discovery with filters (category, level, language, audio, images) |
| `/library` | All enrolled courses + progress |
| `/create` | Course builder (metadata form + AI card generation) |
| `/courses` | User's own published/draft courses |
| `/c/[slug]` | Public course detail page |
| `/c/[slug]/edit` | Edit course cards and metadata |
| `/study/[slug]` | Active study session (SM-2 flashcard modes) |
| `/speed-review/[slug]` | High-speed drilling mode |
| `/leaderboard` | Global XP rankings (paginated) |
| `/u/[username]` | Public user profile (XP heatmap, courses, bio) |
| `/settings` | Language, notification, and preference settings |
| `/billing` | Current plan, quota balance, upgrade/cancel, purchase top-ups |
| `/billing/upgrade` | Plan upgrade checkout |

### `(admin)` — Admin Only

| Route | Description |
|---|---|
| `/admin` | System stats overview |
| `/admin/users` | User list and search |
| `/admin/users/[id]` | Individual user management |

Admin access requires `profiles.is_admin = true`.

---

## API Routes

### `POST /api/analyze-file`

Extracts text from uploaded files for use in AI card generation.

**Supported formats:** JPG/PNG/GIF/WEBP (vision OCR), PDF, DOCX, XLSX, TXT, CSV, JSON, MD

**Request:** `multipart/form-data` with either a `storagePath` (pre-uploaded temp file in Supabase) or an inline file upload.

**Response:**
```json
{ "extractedText": "...", "charCount": 1234 }
```

**Rate limit:** 20 requests / hour / user

**Errors:** `SCANNED_PDF` (no text layer detected), `FILE_TOO_LARGE`, `RATE_LIMITED`

---

### `POST /api/polar/webhook`

Receives and processes Polar billing events.

**Verified via:** HMAC-SHA256 signature (`POLAR_WEBHOOK_SECRET`)

**Idempotency:** Every event is stored as `(provider, event_key)` in `processed_billing_events`; duplicate deliveries are silently ignored.

**Handled events:**

| Event | Action |
|---|---|
| `subscription.created` | Insert/update `user_subscriptions`, grant initial monthly quota |
| `subscription.updated` | Update plan, status, quota balances |
| `subscription.cancelled` / `subscription.revoked` | Update status to `cancelled`/`expired` |
| `order.created` / `checkout.completed` | If top-up product: insert `quota_transactions`, call `refund_quota` RPC |

---

### `GET /auth/callback`

OAuth exchange route. Converts the `code` parameter from Supabase OAuth redirect into a session, then redirects to `/start` (new users) or `/home` (returning users).

---

## Server Actions

All server actions live in `app/actions/` or co-located `actions.ts` files near the pages that use them.

### `app/actions/ai-import.ts`

**`generateCardsWithAI(formData)`** — Main AI card generation pipeline:
1. Accepts text content or a file path
2. Calls `aiComplete()` with a structured prompt
3. Returns array of `{ front, back, distractors[] }` flashcard objects
4. Deducts chars quota based on AI output length

### `app/actions/billing.ts`

- **`startCheckout(plan)`** — Creates a Polar checkout URL for the given plan; handles upgrade prorating
- **`cancelPolarSubscription()`** — Cancels the user's active subscription
- **`updatePolarSubscriptionProduct(newProductId)`** — Upgrades or downgrades the subscription in Polar

### `app/actions/course-drafts.ts`

Auto-save system for course creation (prevents data loss):
- **`saveCourseDraft(key, payload)`** — Upserts a JSON blob into `course_drafts`
- **`loadCourseDraft(key)`** — Retrieves draft by key for the current user
- **`deleteCourseDraft(key)`** — Cleans up on publish or discard

### `app/actions/tts.ts`

**`generateAudio(text, language)`** — Calls Google Cloud TTS, uploads the MP3 to Supabase Storage, and returns the storage URL. Results are cached: calling again with the same text/language returns the existing URL.

### `app/actions/romanization.ts`

**`generateRomanization(text, language)`** — Uses AI to produce phonetic romanization for non-Latin scripts (Japanese, Arabic, Chinese, etc.). Cached after first generation.

### `app/actions/generate-back.ts`

**`generateCardBack(front, language)`** — AI fills in the reverse side of a flashcard given only the front text and target language.

---

## Middleware

**File:** [`proxy.ts`](proxy.ts) (exported as the Next.js middleware)

Runs on every matched request before the page handler:

1. **Bot blocking** — Checks `User-Agent` against a blocklist; returns 403 for known scrapers
2. **Rate limiting** — Uses Upstash Redis:
   - Auth routes (`/login`, `/signup`, `/auth/*`): 20 requests / 60 seconds / IP
   - All other routes: 300 requests / 60 seconds / IP
3. **Session refresh** — Calls `updateSession()` from `utils/supabase/middleware.ts` to keep auth cookies fresh

The matcher covers all protected routes listed in `PROTECTED_PREFIXES` plus auth routes.

---

## AI Integration

### Provider Abstraction

**File:** [`utils/ai-client.ts`](utils/ai-client.ts)

Toggle between providers by changing one line:
```typescript
export const PROVIDER: "anthropic" | "mistral" = "mistral";
```

### Model Mapping

| Provider | Text model | Vision model |
|---|---|---|
| Anthropic | `claude-haiku-4-5-20251001` | `claude-haiku-4-5-20251001` |
| Mistral | `mistral-large-latest` | `pixtral-large-latest` |

### Functions

```typescript
// Non-streaming completion
aiComplete(opts: AICompleteOptions): Promise<AICompleteResult>

// Streaming (async generator)
aiStream(opts: AICompleteOptions): AsyncGenerator<string>

// Image/document OCR
aiExtractTextFromImage(bytes: Buffer, mediaType: string): Promise<string>
```

**Prompt caching** (Anthropic only): Pass `cacheSystem: true` on long, stable system prompts to reduce latency and cost. This is a no-op on Mistral.

### Where AI Is Used

| Feature | Function | Provider |
|---|---|---|
| Card generation from text/files | `generateCardsWithAI()` | Both |
| Card back generation | `generateCardBack()` | Both |
| Image/file OCR | `/api/analyze-file` | Vision model |
| Romanization | `generateRomanization()` | Both |
| Custom card attributes | `generateAttribute()` | Both |

---

## Spaced Repetition (SM-2)

**File:** [`utils/sm2.ts`](utils/sm2.ts)

The study engine implements the SM-2 spaced repetition algorithm.

### Quality Scores

Each answer is mapped to a quality score (0–5) used by SM-2:

| Mode | Correct | Hesitant | Incorrect |
|---|---|---|---|
| `flashcard` | 5 | 3 | 1 |
| `multiple_choice` | 4 | 3 | 1 |
| `audio_type` | 5 | 3 | 1 |
| `type_answer` | 5 | 3 | 1 |
| `speed_match` | 3 | 3 | 1 |

Speed match gets a lower quality ceiling because partial context is visible, making it easier.

### Algorithm Output

```typescript
calculateSM2(quality, easeFactor, interval, repetitions)
// Returns: { interval: days, repetitions: count, easeFactor: float }
```

- **Incorrect (quality < 2):** Reset to interval=1, repetitions=0, easeFactor decreases
- **Correct:** Interval grows: 1d → 3d → interval * easeFactor
- Ease factor is clamped to a minimum of 1.3

### Question Types

```typescript
type QType = "flashcard" | "multiple_choice" | "audio_type" | "speed_match" | "type_answer";
```

Users can set preferred question types per course in `user_courses.preferred_question_types`. The study session picks from those types.

---

## Billing & Payments (Polar)

### Plans

| Plan | Monthly | Yearly | Monthly Characters |
|---|---|---|---|
| Free | $0 | — | 5,000 |
| Plus | $5 | $48 | 300,000 |
| Pro | $10 | $96 | 1,000,000 |

Character allowances refill once a month on every plan. Polar renewals grant the
allowance for monthly plans; free users and yearly subscribers are refilled lazily
by `refresh_quota_if_due()` (see `supabase/migrations/058_monthly_quota_refresh.sql`),
using `user_subscriptions.quota_reset_at`. Allowances live in `PLAN_QUOTA`
(`utils/polar.ts`) and `plan_monthly_chars()` (SQL) — keep them in sync.

### One-Time Top-Ups

| Pack | Characters | Price |
|---|---|---|
| Small | 100,000 | $1.99 |
| Medium | 300,000 | $4.99 |
| Large | 1,000,000 | $14.99 |

| Pack | Tutor Sessions | Price |
|---|---|---|
| Small | 10 | $1.99 |
| Medium | 30 | $4.99 |
| Large | 100 | $14.99 |

### Checkout Flow

```
User clicks "Upgrade" → startCheckout(plan) server action
    → Polar creates a checkout session
    → User is redirected to Polar hosted checkout
    → On success, Polar sends webhook to /api/polar/webhook
    → Webhook updates user_subscriptions and grants quota
```

### Webhook Event Flow

```
Polar → POST /api/polar/webhook
    → Verify HMAC-SHA256 signature
    → Check processed_billing_events (idempotency)
    → subscription.created → upsert user_subscriptions + grant quota
    → order.created (top-up) → insert quota_transactions + call refund_quota RPC
    → subscription.updated → update plan/status
    → subscription.cancelled → set status = 'cancelled'
```

**Idempotency key:** `${provider}:${event.id}` — prevents double-processing on webhook retries.

### Key Files

- [`utils/polar.ts`](utils/polar.ts) — Product IDs, plan config, checkout helper, signature verification
- [`app/actions/billing.ts`](app/actions/billing.ts) — Server actions for plan management
- [`app/api/polar/webhook/route.ts`](app/api/polar/webhook/route.ts) — Webhook handler
- [`app/(app)/billing/page.tsx`](app/(app)/billing/page.tsx) — Billing UI

---

## Quota System

**File:** [`utils/quota.ts`](utils/quota.ts)

The quota system is a double-entry ledger stored in `quota_transactions`. The balance is the sum of all transactions per user per resource.

### Resources

- **`chars`** — AI generation + TTS character costs
- **`tutor_sessions`** — Interactive AI chat sessions

### Functions

```typescript
// Get current balance
getQuotaBalance(supabase, userId, resource): Promise<number>

// Deduct quota — returns false if insufficient balance
deductQuota(supabase, userId, resource, amount): Promise<boolean>

// Credit quota (top-up or monthly grant)
refundQuota(supabase, userId, resource, amount, reason): Promise<void>
```

### Transaction Reasons

| Reason | When |
|---|---|
| `monthly_grant` | Subscription renews |
| `purchase` | Top-up order completed |
| `usage` | AI generation, TTS, or tutor session |
| `refund` | Error recovery |
| `chargeback` | Disputed payment |
| `admin_grant` | Manual admin credit |
| `compensation` | Goodwill credit |

Always use the admin Supabase client for quota operations (RLS prevents users from writing to `quota_transactions` directly).

---

## Text-to-Speech & Storage

### TTS

**File:** [`app/actions/tts.ts`](app/actions/tts.ts)

- Uses Google Cloud TTS REST API
- Language → voice mapping in [`utils/tts.ts`](utils/tts.ts)
- Generated MP3s are uploaded to Supabase Storage and the URL is stored on the `items` row
- Generating the same text + language twice returns the cached URL without calling Google

### Supabase Storage Buckets

| Bucket | Contents |
|---|---|
| `temp-uploads` | Temporary files for `/api/analyze-file` — auto-cleaned after processing |
| Course assets | Course cover images, card images, audio files |

File paths follow the pattern: `/{course-id}/{item-id}/{type}.{ext}`

Public URLs are resolved via [`utils/resolve-media-url.ts`](utils/resolve-media-url.ts).

---

## Internationalization

**File:** [`utils/i18n.ts`](utils/i18n.ts)

### UI Languages

82 locale files in `public/locales/{language}.json`. Each file is keyed by component/section (e.g., `home.welcomeBack`, `billing.upgrade`).

The active UI language is stored in `profiles.active_origin_language`. Users can change it in Settings.

### Learning Languages

Courses have a `source_language` (instruction language, e.g. "English") and `target_language` (what's being learned, e.g. "Spanish"). 80+ spoken languages plus 14 special ones (Latin, ASL, etc.) are supported.

---

## Rate Limiting

**File:** [`utils/rate-limit.ts`](utils/rate-limit.ts)

Uses Upstash Redis with the sliding window algorithm.

| Context | Limit |
|---|---|
| Auth routes (`/login`, `/signup`, `/auth/*`) | 20 req / 60s / IP |
| App routes (everything else) | 300 req / 60s / IP |
| File analysis API (`/api/analyze-file`) | 20 req / hr / user |

Responses on limit breach:
```json
HTTP 429  { "error": "Too many requests. Try again shortly." }
Header:   Retry-After: <seconds>
```

---

## Key Utilities

### `utils/supabase/server.ts`

```typescript
createClient()   // Supabase client scoped to the current user's cookies (SSR)
```

Use in: server components, server actions, API routes when you need to act as the authenticated user.

### `utils/supabase/admin.ts`

```typescript
createAdminClient()   // Service-role client, bypasses all RLS
```

Use only for: quota operations, billing webhook handling, admin routes, system-level inserts that users cannot do themselves.

### `utils/ai-client.ts`

Abstraction over Anthropic and Mistral. See [AI Integration](#ai-integration).

### `utils/sm2.ts`

SM-2 algorithm + quality score mapping + interval formatting. See [Spaced Repetition](#spaced-repetition-sm-2).

---

## Design System

**File:** [`tailwind.config.ts`](tailwind.config.ts)

### Color Palette

| Token | Hex | Use |
|---|---|---|
| `primary` | `#F35B45` | Primary actions, CTAs |
| `mango` | `#F7C842` | Secondary highlights |
| `pink` | `#FF0054` | Accent / alerts |
| `acid` | `#9EFF00` | Success / correct answers |
| `ink` | `#1B1716` | Body text |
| `paper` | `#FFF3D6` | Page background (light mode) |
| `paper-2` | `#FFFBEF` | Card/surface background |
| `ocean` | `#BFE7D7` | Soft accent |
| `blue` | `#2F6F89` | Links / info states |

### Typography

Custom brand font stack: `young` (display), `fredoka`, `manrope`, `kalam`, `mono`. No system fonts.

### Aesthetic Conventions

- Border: 2px default (chunky, playful)
- Border radius: 14px (sm), 22px (md), 30px (lg)
- Shadows: Hard drop shadows with 8px offset (`shadow-hard`) — signature brand look
- Theme: Light/dark via `data-theme` attribute on `<html>`, persisted in `localStorage`

---

## Deployment

The app is deployed on **Vercel**. Key configuration:

- `NEXT_PUBLIC_SITE_URL` must be set to the production URL for OAuth redirects and server action CORS
- `serverActions.allowedOrigins` in `next.config.ts` is for ngrok dev tunneling — remove or leave empty in production
- `serverExternalPackages: ["pdf-parse"]` is required because `pdf-parse` uses native Node.js `fs` and cannot be bundled

### Build

```bash
pnpm run build   # Next.js production build
pnpm run start   # Starts production server locally
pnpm run lint    # ESLint
```

### Supabase CLI Commands

```bash
supabase login
supabase link --project-ref <project-id>
supabase db push          # Apply pending migrations
supabase db pull          # Pull remote schema changes
supabase gen types typescript --linked > types/supabase.ts  # Regenerate DB types
```

Run `supabase gen types` after any schema change to keep `types/supabase.ts` in sync.
