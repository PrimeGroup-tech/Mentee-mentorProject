# PASS Mentoring Matching System — Vercel Deployment Guide

## What's Included

This is a **fully Vercel-ready** codebase. All platform-specific code has been replaced:

- **File Storage** → Vercel Blob (replaces AWS S3)
- **Email** → Resend (pluggable — see `lib/email.ts`)
- **Database** → Standard PostgreSQL via Prisma (Neon recommended)
- **Auth** → NextAuth.js (built-in, no external service needed)

---

## Step-by-Step Deployment

### Step 1: Create a Vercel Project

1. Go to [vercel.com](https://vercel.com) → Click **"Add New..."** → **Project**
2. Import from GitHub (after pushing this code — see Step 5)
3. Set **Framework Preset** to **Next.js**

### Step 2: Set Up Database (Neon — Free Tier)

1. Go to [neon.tech](https://neon.tech) → Sign up → Create a new project
2. In the **Connection Details** panel, copy:
   - **Pooled connection string** → `DATABASE_URL`
   - **Direct connection string** → `DIRECT_URL`
3. Add both to Vercel: **Project Settings → Environment Variables**

> **Tip:** You can also add Neon directly from Vercel: **Storage → Create → Neon Postgres**

### Step 3: Set Up File Storage (Vercel Blob)

1. In Vercel Dashboard: **Storage → Create → Blob**
2. That's it! Vercel Blob authenticates automatically on deployments via OIDC
3. For local development, copy the `BLOB_READ_WRITE_TOKEN` from **Storage → Blob → Settings → Tokens**

### Step 4: Set Up Email (Resend — Free Tier)

1. Go to [resend.com](https://resend.com) → Sign up (free: 3,000 emails/month)
2. Get your API key from **API Keys** page
3. Open `lib/email.ts` and uncomment the Resend implementation
4. Add `RESEND_API_KEY` to Vercel Environment Variables

### Step 5: Push to GitHub & Deploy

```bash
# Extract the archive
tar -xzf pass-mentoring-vercel.tar.gz
cd vercel-ready

# Initialize repo
git init
git add .
git commit -m "PASS Mentoring System - initial commit"

# Push to GitHub (using GitHub CLI or manual)
gh repo create pass-mentoring-system --private --push
# OR: create repo on github.com, then:
# git remote add origin https://github.com/YOUR_USER/pass-mentoring-system.git
# git push -u origin main
```

Then in Vercel:
1. **Add New → Project → Import** your GitHub repo
2. Add all environment variables (see table below)
3. Click **Deploy**

### Step 6: Configure Environment Variables

Add these in **Vercel Dashboard → Settings → Environment Variables**:

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | `postgresql://...` | Pooled connection from Neon |
| `DIRECT_URL` | `postgresql://...` | Direct connection from Neon |
| `NEXTAUTH_URL` | `https://your-domain.com` | Your deployment URL |
| `NEXTAUTH_SECRET` | (generate) | Run `openssl rand -base64 32` |
| `BLOB_READ_WRITE_TOKEN` | (auto or manual) | Auto on Vercel; manual for local dev |
| `RESEND_API_KEY` | `re_...` | From resend.com |

### Step 7: Initialize the Database

After the first deployment, push the schema:

```bash
# Install dependencies locally
npm install

# Push schema to Neon database
npx prisma db push

# Seed initial data (admin user, sample mentors)
npx prisma db seed
```

The `postinstall` script automatically runs `prisma generate` during Vercel builds.

### Step 8: Point Your Subdomain

1. In Vercel: **Settings → Domains → Add** your subdomain
2. In your DNS provider: add a **CNAME** record pointing to `cname.vercel-dns.com`
3. Vercel auto-provisions SSL

---

## File Changes Summary

| File | Change |
|------|--------|
| `package.json` | Replaced `@aws-sdk/*` with `@vercel/blob`; added `prisma generate` to build |
| `prisma/schema.prisma` | Removed platform paths; added `directUrl` for pooling |
| `next.config.js` | Removed `output`, `distDir`, webpack overrides |
| `lib/blob-storage.ts` | **NEW** — Vercel Blob upload utility |
| `lib/email.ts` | **NEW** — Pluggable email utility (Resend ready) |
| `lib/aws-config.ts` | **REMOVED** — No longer needed |
| `app/layout.tsx` | Removed platform chat widget |
| `app/api/mentors/upload-photo/route.ts` | S3 → Vercel Blob |
| `app/api/admin/bulk-upload/photos/route.ts` | S3 → Vercel Blob |
| `app/api/admin/mentors/[mentorId]/route.ts` | S3 → Vercel Blob |
| `app/api/*/export/*/route.ts` (4 files) | Platform email API → `sendEmail()` |
| `app/api/preferences/submit/route.ts` | Platform email API → `sendEmail()` |
| `app/api/assignments/confirm/route.ts` | Platform email API → `sendEmail()` |
| `.env.example` | **NEW** — All required variables documented |
| `.gitignore` | **NEW** |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Prisma errors on deploy | Ensure `DATABASE_URL` and `DIRECT_URL` are set; check Neon dashboard for connection status |
| Auth redirect issues | `NEXTAUTH_URL` must exactly match your deployment URL (including `https://`) |
| Photo uploads failing | Check Vercel Blob is created in Storage tab; for local dev, ensure `BLOB_READ_WRITE_TOKEN` is set |
| Email not sending | Verify Resend API key; check sender domain is verified in Resend dashboard |
| Build fails | Run `npx prisma generate` locally first; check for TypeScript errors with `npx tsc --noEmit` |
