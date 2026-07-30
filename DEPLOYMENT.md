# Life Blossom Hospital — Production Deployment Guide

**Stack:** Next.js 16 (App Router) · Supabase · Netlify · Paystack  
**Last updated:** 2026-07-30

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Supabase Setup (Backend)](#3-supabase-setup-backend)
4. [Netlify Setup (Frontend)](#4-netlify-setup-frontend)
5. [Environment Variables](#5-environment-variables)
6. [CI/CD Pipeline](#6-cicd-pipeline)
7. [Production Checklist](#7-production-checklist)
8. [Monitoring & Maintenance](#8-monitoring--maintenance)
9. [Troubleshooting](#9-troubleshooting)
10. [Appendices](#10-appendices)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Netlify CDN                       │
│  ┌──────────────┐  ┌────────────┐  ┌────────────┐  │
│  │ Static Assets │  │ Next.js   │  │ Middleware  │  │
│  │ (_next/static)│  │ SSR/API   │  │ (Edge fn)  │  │
│  └──────┬───────┘  └─────┬──────┘  └──────┬─────┘  │
└─────────┼────────────────┼────────────────┼─────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────┐
│                   Supabase                           │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ Auth     │  │ Database │  │ Storage           │  │
│  │ (Auth UI)│  │ (PostGIS)│  │ (avatars, docs)   │  │
│  └──────────┘  └──────────┘  └───────────────────┘  │
└─────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────┐
│              Paystack (NGN Payments)                  │
│  ┌──────────────┐  ┌─────────────────────────────┐  │
│  │ Checkout     │  │ Webhook → POST /api/payments│  │
│  │ (frontend)   │  │ /webhook                    │  │
│  └──────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Decision | Rationale |
|---|---|
| **Netlify over Vercel** | Free tier includes 100 GB bandwidth, 300 build minutes/mo, team seats |
| **Supabase over direct Postgres** | Managed auth, auto-backups, dashboard, row-level security |
| **Next.js API routes** | Co-located backend logic with frontend — no separate BE server |
| **Middleware auth guard** | Protects `/patient/*` and `/admin/*` at the edge before SSR |
| **RLS + service role** | Row-level security for patient queries; service role for admin writes |

---

## 2. Prerequisites

| Tool | Version | Why |
|---|---|---|
| Node.js | 22.x (LTS) | Runtime for builds |
| npm | 10.x | Package manager |
| Git | 2.40+ | Source control |
| Supabase account | Free tier | Database + Auth + Storage |
| Netlify account | Free tier | Hosting + CI/CD |
| Paystack account | Test/Live | NGN payment processing |

---

## 3. Supabase Setup (Backend)

### 3.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Fill in:
   - **Name:** `life-blossom-hosp`
   - **Database Password:** generate a strong one (save it)
   - **Region:** `West Europe` (London) — closest to Lagos for low latency
   - **Pricing Plan:** Free (500 MB DB, 5 GB bandwidth, 50k monthly active users)
3. Wait ~2 minutes for provisioning.

### 3.2 Get API Credentials

Navigate to **Project Settings → API**:

```
Project URL  →  NEXT_PUBLIC_SUPABASE_URL
anon public  →  NEXT_PUBLIC_SUPABASE_ANON_KEY
service_role →  SUPABASE_SERVICE_ROLE_KEY
```

> **Security note:** `anon key` is public (embedded in the browser).  
> `service_role key` bypasses RLS — **never expose it client-side**.

### 3.3 Run the Database Schema

Open **Supabase SQL Editor** and paste the contents of `database/schema.sql` (or `scripts/supabase-schema.sql`). Click **Run**.

This creates all 16 tables, indexes, triggers, RLS policies, and seed data.

**Verify:** Run the following in SQL Editor:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;
```
Expect 16 tables: `appointments`, `audit_logs`, `expenses`, `invoice_items`, `invoices`, `medical_records`, `notifications`, `organizations`, `other_income`, `patients`, `payments`, `prescription_items`, `prescriptions`, `push_subscriptions`, `staff`, `users`.

### 3.4 Configure Authentication

1. **Supabase → Authentication → Settings → Site URL**  
   Set to your deployed Netlify URL: `https://your-site.netlify.app`

2. **Redirect URLs** — add both:
   - `https://your-site.netlify.app/auth/callback`
   - `http://localhost:3000/auth/callback` (for local dev)

3. **Enable Email/Password** provider (default is on).

### 3.5 Configure Storage (Optional — for Avatar Uploads)

1. **Supabase → Storage → Create bucket**
   - Name: `avatars`
   - Public: ✅
2. **RLS Policy** — allow authenticated users to read/write their own:
```sql
CREATE POLICY "users can upload own avatar" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "public avatar read" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'avatars');
```

> **Note:** The current code stores avatars in `/public/uploads/avatars/` (filesystem).  
> For **serverless (Netlify)**, the filesystem is **ephemeral** — uploaded files are lost after each deployment.  
> **Recommendation:** Migrate to Supabase Storage after initial deployment. See [Storage Migration](#102-migrate-avatars-to-supabase-storage).

---

## 4. Netlify Setup (Frontend)

### 4.1 Option A: Deploy from Git (Recommended)

1. Push your repo to GitHub (or GitLab / Bitbucket).

2. Log in to [netlify.com](https://netlify.com) → **Add new site → Import existing project**.

3. Connect your Git provider and select the `life-blossom-hosp` repo.

4. Configure build settings (should auto-detect from `netlify.toml`):

   | Setting | Value |
   |---|---|
   | Base directory | *(leave blank)* |
   | Build command | `npm run build` |
   | Publish directory | `.next` |

   > Netlify automatically detects Next.js and uses the **Netlify Next.js Runtime** (plugin `@netlify/plugin-nextjs`). No manual plugin install needed.

5. **Add environment variables** (see §5 below).

6. Click **Deploy site**.

### 4.2 Option B: Deploy with Netlify CLI

```bash
# 1. Install CLI
npm install -g netlify-cli

# 2. Login
netlify login

# 3. Init (links your local repo to a Netlify site)
netlify init

# 4. Set env vars
netlify env:set NEXT_PUBLIC_SUPABASE_URL "https://xyz.supabase.co"
netlify env:set NEXT_PUBLIC_SUPABASE_ANON_KEY "eyJhbGci..."
netlify env:set SUPABASE_SERVICE_ROLE_KEY "eyJhbGci..."
netlify env:set NEXT_PUBLIC_APP_URL "https://your-site.netlify.app"

# 5. Deploy
netlify deploy --prod
```

### 4.3 Custom Domain (Production)

1. **Netlify → Site → Domain settings → Add custom domain**
2. Enter: `hospital.yourdomain.com` (or the apex domain)
3. Update your DNS **NS records** to point to Netlify's DNS servers.
4. Wait for DNS propagation (5–30 min).
5. Update `NEXT_PUBLIC_APP_URL` to the custom domain.

> **.com.ng domains?** Netlify supports them as custom domains.  
> If your registrar doesn't allow NS changes, use a **CNAME alias** on `www` to `your-site.netlify.app`.

### 4.4 What netlify.toml Does

The `netlify.toml` in the project root configures:

| Section | Purpose |
|---|---|
| `[build]` | Command, publish dir, functions dir |
| `[[plugins]]` | Loads `@netlify/plugin-nextjs` for Next.js SSR/API support |
| `[[headers]]` | Cache control for static assets, security headers (HSTS, CSP, XFO) |
| `[[redirects]]` | SPA fallback, API passthrough, 404 handling |

> **Key: Security headers** are set at the Netlify CDN edge, so they apply *before* any request reaches your app code. This includes `Strict-Transport-Security`, `X-Content-Type-Options`, and `Permissions-Policy`.

---

## 5. Environment Variables

Set these in **Netlify → Site → Environment variables** (or `netlify env:set`).

### Required

| Variable | Where to Get | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API | Starts with `https://` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API | Starts with `eyJ` (JWT) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API | Starts with `eyJ` — **keep secret** |
| `NEXT_PUBLIC_APP_URL` | Your deployed URL | e.g. `https://hospital.yourdomain.com` |

### Optional (but recommended)

| Variable | Where to Get | Notes |
|---|---|---|
| `PAYSTACK_SECRET_KEY` | Paystack Dashboard → Settings | Live key starts with `sk_live_` |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Paystack Dashboard → Settings | Live key starts with `pk_live_` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `npx web-push generate-vapid-keys` | Web push notifications |
| `VAPID_PRIVATE_KEY` | Same command | Keep secret |
| `VAPID_SUBJECT` | `mailto:admin@yourdomain.com` | Required for push |

### ⚠️ Local Development

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in the values from your Supabase project.

> `.env.local` is in `.gitignore` — never commit secrets.

---

## 6. CI/CD Pipeline

Netlify provides **auto-deploy from Git** — every push to `master` triggers a build + deploy.

### 6.1 Branch Deployments (Preview URLs)

Netlify creates **deploy previews** for every PR branch. Useful for testing before merging:

```
PR #42 → https://deploy-preview-42--your-site.netlify.app
```

### 6.2 Deploy Contexts

| Context | Trigger | Env Vars | Use Case |
|---|---|---|---|
| `production` | Push to `master` | Production keys | Live site |
| `deploy-preview` | PR opened/updated | Production keys + PR metadata | QA review |
| `branch-deploy` | Push to any branch | *(same as production)* | Developer testing |

You can **override env vars per context** in Netlify dashboard → Site → Environment → Deploy contexts.

### 6.3 CI Workflow (netlify.toml)

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[build.environment]
  NEXT_PRIVATE_STANDALONE = "false"   # Netlify handles output
```

### 6.4 Manual Rollback

1. Netlify → Site → Deploys
2. Find the working deploy → **Click "..." → Publish deploy**

Each deploy retains full build artifacts, so rollback is instant.

### 6.5 Deploy Lock (Prevent Concurrent Deploys)

If two people push at once, Netlify queues them. You can lock deploys during critical operations:

```bash
netlify deploy:lock
netlify deploy:unlock
```

---

## 7. Production Checklist

### Pre-Launch

- [ ] **Custom domain** configured + HTTPS working
- [ ] **Supabase Auth Site URL** set to production domain
- [ ] **Paystack webhook** configured to `https://yourdomain.com/api/payments/webhook`
- [ ] **Environment variables** verified (run a test API call)
- [ ] **Seed data** working (login with demo accounts)
- [ ] **Avatar uploads** migrated to Supabase Storage (see §10.2)
- [ ] **VAPID keys** generated for push notifications (if using)
- [ ] **Sitemap** submitted to Google Search Console
- [ ] **`robots.txt`** updated to allow indexing

### Security

- [ ] `Strict-Transport-Security` header active (config in `netlify.toml`)
- [ ] `Permissions-Policy` restricts camera/mic/geo (config in `netlify.toml`)
- [ ] Supabase **RLS policies** enabled on all tables
- [ ] Service role key **never used client-side**
- [ ] Rate limiting: consider Supabase Auth's built-in rate limits
- [ ] Paystack webhook **verification** (validate HMAC SHA-512 signature)

### Performance

- [ ] Images optimized (Next.js `<Image>` with remote patterns)
- [ ] Font subsetting (Inter variable font — already in `next.config.ts`)
- [ ] Static assets cached at CDN edge (1 year for `_next/static/*`)
- [ ] Lazy load heavy components (`react-lazy` or dynamic imports)

### SEO

- [ ] Meta tags present (title, description — already in `layout.tsx`)
- [ ] Open Graph images for social sharing
- [ ] Structured data (JSON-LD for LocalBusiness / Hospital schema)

---

## 8. Monitoring & Maintenance

### 8.1 Netlify Analytics (Free tier)

Basic analytics included: bandwidth, requests, deploy status.

### 8.2 Supabase Monitoring

- **Database → Reports** → Query performance, slow queries
- **Auth → Users** → Active users, sign-ups
- **Logs** → API errors, auth errors

### 8.3 Error Tracking (Recommended)

Add a free error-tracking service:

```bash
npm install @sentry/nextjs
npx sentry-wizard -i nextjs
```

Sentry's free tier: 5k events/mo — sufficient for an early-stage hospital app.

### 8.4 Uptime Monitoring

Use a free service like **UptimeRobot** (50 monitors, 5-min checks):

```
https://yourdomain.com/api/auth/me  → Expect 200 or 401 (not 5xx)
```

### 8.5 Database Backups

Supabase Free tier includes **daily backups** (7-day retention).  
You can also run a manual pg_dump:

```bash
pg_dump --dbname=postgresql://postgres:[PASSWORD]@db.xyz.supabase.co:5432/postgres > backup_$(date +%Y%m%d).sql
```

### 8.6 Common Maintenance Tasks

| Task | Frequency | Command / Action |
|---|---|---|
| Rotate service_role key | Every 90 days | Supabase → Project Settings → API |
| Review Supabase Auth logs | Monthly | Authentication → Logs |
| Update npm dependencies | Monthly | `npm outdated` then `npm update` |
| Check Netlify build minutes | Monthly | Netlify → Overview → Usage |
| Verify seed data | After each deploy | Login as each role |

---

## 9. Troubleshooting

### 9.1 Build Failures

| Symptom | Likely Cause | Fix |
|---|---|---|
| `Module not found: Can't resolve '...'` | Missing dependency | `npm install` locally, commit `package-lock.json` |
| `TypeScript error` | Type mismatch | Run `npx tsc --noEmit` locally, fix errors |
| `Build timed out` | Free tier limit (300 min/mo) | Wait for reset or upgrade |
| `Cannot find module 'next'` | `NODE_ENV` mismatch | Ensure `NODE_ENV=production` on Netlify |

### 9.2 Runtime Errors

| Symptom | Likely Cause | Fix |
|---|---|---|
| `401 Not authenticated` on API calls | Missing/corrupt Supabase session | Clear cookies, re-login |
| `Failed to fetch` from API | CORS or wrong `NEXT_PUBLIC_APP_URL` | Verify env var matches domain |
| `relation "expenses" does not exist` | Schema not migrated | Run `scripts/supabase-schema.sql` in SQL Editor |
| Avatar upload returns 404 | Ephemeral filesystem | See §10.2 — migrate to Supabase Storage |
| Paystack popup doesn't open | Public key missing | Check `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` |
| Middleware infinite redirect | Auth cookie issue | Clear site cookies, re-login |
| `Edge Function size exceeds limit` | Middleware too large | Optimize imports in `middleware.ts` |

### 9.3 Netlify-Specific

| Symptom | Likely Cause | Fix |
|---|---|---|
| `404 on /admin page` after deploy | Deploy cache | Netlify → Deploys → "Clear cache and retry" |
| `502 Bad Gateway` | Serverless function timeout | Increase function timeout in `netlify.toml` |
| Preview URL blank | Deploy preview branching | Check branch name matches `DEPLOY_PRIME_URL` |
| `.env` variables not taking effect | Redeploy needed | Push an empty commit or trigger manual deploy |

### 9.4 Quick Diagnostics

```bash
# 1. Check build logs
netlify deploy --prod --debug

# 2. Verify env vars are set
netlify env:list

# 3. Test API endpoint locally
curl https://your-site.netlify.app/api/auth/me

# 4. Check if Supabase is reachable
curl https://YOUR-PROJECT.supabase.co/rest/v1/ -H "apikey: $SUPABASE_ANON_KEY"
```

---

## 10. Appendices

### 10.1 File Reference

| File | Purpose |
|---|---|
| `netlify.toml` | Netlify build config, headers, redirects |
| `.env.example` | Template for all environment variables |
| `scripts/supabase-schema.sql` | Idempotent DB schema (safe to re-run) |
| `src/middleware.ts` | Auth guard at the edge (routes `/patient/*`, `/admin/*`, `/login`) |
| `next.config.ts` | Next.js config (images, output) |
| `database/schema.sql` | Full schema with seed data (for development) |

### 10.2 Migrate Avatars to Supabase Storage

The current code stores uploaded avatars in `/public/uploads/avatars/`.  
On Netlify, the filesystem is **read-only in production** — uploads succeed but are lost after the next deploy.

**Fix:** Use Supabase Storage instead.

**Step 1:** Create the `avatars` bucket in Supabase (see §3.5).

**Step 2:** Update `src/app/api/upload/avatar/route.ts`:

```typescript
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("avatar") as File;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const ext = file.name.split(".").pop();
  const fileName = `${user.id}/avatar-${Date.now()}.${ext}`;

  const { data, error } = await supabase.storage
    .from("avatars")
    .upload(fileName, file, { upsert: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(fileName);

  // Update user's avatar_url in the users table
  await supabase.from("users").update({ avatar_url: publicUrl }).eq("id", user.id);

  return NextResponse.json({ avatar_url: publicUrl });
}
```

**Step 3:** Remove the filesystem upload route and `public/uploads/` from git tracking.

### 10.3 Supabase RLS Testing

When debugging RLS issues, always check:

1. **Is RLS enabled?**  
   `SELECT relname, relrowsecurity FROM pg_class WHERE relrowsecurity = true;`

2. **Which policy applies?**  
   Use `EXPLAIN` with the query to see which policies are used.

3. **Test as a specific user**  
   Supabase SQL Editor runs as superadmin (bypasses RLS). To test as a user:

   ```sql
   SET LOCAL ROLE authenticated;
   SET LOCAL "request.jwt.claim.sub" TO 'b0000000-0000-0000-0000-000000000001';
   SELECT * FROM users;
   ```

### 10.4 Paystack Webhook Setup

1. **Paystack Dashboard → Settings → Webhooks**
2. **Add Webhook URL:** `https://yourdomain.com/api/payments/webhook`
3. **Events to send:** `charge.success`, `transfer.success`
4. **Verify HMAC SHA-512 signature** in the webhook handler (already implemented in `src/app/api/payments/webhook/route.ts`).

### 10.5 Useful Commands

```bash
# Local dev
npm run dev                    # → http://localhost:3000

# Type check
npx tsc --noEmit

# Test production build locally
npm run build
npm start                      # → http://localhost:3000 (production mode)

# Netlify CLI (full dev with functions)
npx netlify dev                # → http://localhost:8888

# Deploy from CLI
netlify deploy --prod

# Check deployed env vars
netlify env:list

# Tail build logs (real-time)
netlify deploy --prod --json | jq .logs_url
```

### 10.6 Cost Breakdown (Free Tier)

| Service | Free Tier Limit | Estimated Usage | Overage Cost |
|---|---|---|---|
| **Netlify** | 100 GB bandwidth, 300 min build/mo | ~5 GB/mo, ~50 build min/mo | $0 (within free tier) |
| **Supabase** | 500 MB DB, 5 GB bandwidth, 50k MAU | ~100 MB DB, ~2 GB bandwidth | $0 (within free tier) |
| **Paystack** | 1% + ₦100 per successful transaction | ~200 transactions/mo | ₦20,000/mo (at ₦10M revenue) |
| **Sentry (optional)** | 5k events/mo | ~500 events/mo | $0 (within free tier) |

---

**You're ready to deploy. Let's go live.** 🚀
